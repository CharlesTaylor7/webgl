#![feature(const_fn_floating_point_arithmetic, const_refs_to_static)]
use gl_matrix::common::{Mat4, Vec3, PI};
use gl_matrix::{mat4, vec3};
use std::borrow::BorrowMut;
use std::cell::RefCell;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use web_sys::js_sys::{Float32Array, Uint32Array};
use web_sys::{
  console, window, HtmlCanvasElement, HtmlElement, KeyboardEvent, WebGlProgram,
  WebGlRenderingContext, WebGlShader,
};

thread_local! {
  static STATE: RefCell<State> = init_state();
  static KEYMAP: Keymap = init_keymap();
  static PROJECTION: Mat4 = init_projection();
}

fn init_state() -> RefCell<State> {
  RefCell::new(State::new())
}

fn init_keymap() -> Keymap {
  HashMap::from([
    ("w", CameraMotion::new(Orientation::Negative, Axis::X)),
    ("a", CameraMotion::new(Orientation::Negative, Axis::Y)),
    ("s", CameraMotion::new(Orientation::Positive, Axis::X)),
    ("d", CameraMotion::new(Orientation::Positive, Axis::Y)),
    ("q", CameraMotion::new(Orientation::Positive, Axis::Z)),
    ("e", CameraMotion::new(Orientation::Negative, Axis::Z)),
  ])
}

fn init_projection() -> Mat4 {
  let gl = webgl_context().unwrap();
  let mut m = mat4::create();
  get_projection_matrix(&gl, &mut m);
  m
}

type Result<T, E = JsValue> = std::result::Result<T, E>;

type Keymap = HashMap<&'static str, CameraMotion>;
enum Axis {
  X,
  Y,
  Z,
}
enum Orientation {
  Positive,
  Negative,
}
struct CameraMotion {
  axis: Axis,
  orientation: Orientation,
}
impl CameraMotion {
  fn new(orientation: Orientation, axis: Axis) -> Self {
    Self { orientation, axis }
  }
}

const ANIMATION_DURATION: f32 = 400.0;

// it takes 1.6 seconds to rotate the camera 120 degrees
const CAMERA_SPEED: f32 = (2.0 * PI) / (3.0 * 1600.0);

#[wasm_bindgen]
pub fn render(ms: f32) -> Result<()> {
  let gl = webgl_context()?;

  STATE.with_borrow_mut(|p| {
    let delta = ms - p.then;
    p.then = ms;

    if p.camera_axis.iter().any(|c| *c != 0.0) {
      let mut transform = mat4::create();
      mat4::from_rotation(&mut transform, delta * CAMERA_SPEED, &p.camera_axis);
      let mut camera = mat4::create();
      mat4::multiply(&mut camera, &transform, &p.camera_transform);
      p.camera_transform = camera;

      PROJECTION.with(|projection| {
        mat4::multiply(&mut transform, projection, &p.camera_transform);
        set_transform_matrix(&gl, &transform);
      });
    }

    /*
    set_vertex_colors(&gl, &p.get_vertex_colors());
    set_vertex_indices(&gl, &p.get_vertex_indices());
    set_vertex_positions(&gl, &p.get_vertex_positions());
    */
    clear_scene(&gl);
    resize_to_screen(&gl);
    let n = p.get_index_count() as i32;
    gl.draw_elements_with_i32(
      WebGlRenderingContext::TRIANGLES,
      n,
      WebGlRenderingContext::UNSIGNED_INT,
      0,
    );
  });
  Ok(())
}

#[wasm_bindgen]
pub fn on_key_down(event: &KeyboardEvent) {
  console::log_2(&JsValue::from("keydown"), &JsValue::from(event));
  KEYMAP.with(|keymap| {
    STATE.with_borrow_mut(|state| {
      let key: String = event.key();
      let b: &str = &key;
      if let Some(CameraMotion { axis, orientation }) = keymap.get(b) {
        let val = match orientation {
          Orientation::Positive => 1.0,
          Orientation::Negative => -1.0,
        };
        match axis {
          Axis::X => {
            state.camera_axis[0] = val;
          }
          Axis::Y => {
            state.camera_axis[1] = val;
          }
          Axis::Z => {
            state.camera_axis[2] = val;
          }
        }
      }

      console::log_2(
        &JsValue::from("camera_axis"),
        &JsValue::from(&Float32Array::from(state.camera_axis.as_slice())),
      );
    })
  })
}

#[wasm_bindgen]
pub fn on_key_up(event: &KeyboardEvent) {
  console::log_2(&JsValue::from("keyup"), &JsValue::from(event));
  KEYMAP.with(|keymap| {
    STATE.with_borrow_mut(|state| {
      let key: String = event.key();
      let b: &str = &key;
      if let Some(CameraMotion { axis, .. }) = keymap.get(b) {
        match axis {
          Axis::X => {
            state.camera_axis[0] = 0.0;
          }
          Axis::Y => {
            state.camera_axis[1] = 0.0;
          }
          Axis::Z => {
            state.camera_axis[2] = 0.0;
          }
        }
      }

      console::log_4(
        &JsValue::from("camera_axis"),
        &JsValue::from(state.camera_axis[0]),
        &JsValue::from(state.camera_axis[1]),
        &JsValue::from(state.camera_axis[2]),
      );
    })
  });
}

const VERTEX_SHADER: &str = r##"
  attribute vec4 vertexPosition;
  attribute vec4 vertexColor;

  uniform mat4 transformMatrix;

  varying lowp vec4 fragmentColor;

  void main(void) {
    gl_Position = transformMatrix * vertexPosition;
    fragmentColor = vertexColor;
  }
"##;

const FRAGMENT_SHADER: &str = r##"
  varying lowp vec4 fragmentColor;

  void main(void) {
    gl_FragColor = fragmentColor;
  }
"##;

#[wasm_bindgen(start)]
fn start() -> Result<()> {
  let gl = webgl_context()?;
  // enable u32 type
  gl.get_extension("OES_element_index_uint")?;

  let vertex_shader = compile_shader(&gl, WebGlRenderingContext::VERTEX_SHADER, VERTEX_SHADER)?;
  let fragment_shader =
    compile_shader(&gl, WebGlRenderingContext::FRAGMENT_SHADER, FRAGMENT_SHADER)?;
  let program = link_program(&gl, &vertex_shader, &fragment_shader)?;
  gl.use_program(Some(&program));

  PROJECTION.with(|projection| {
    set_transform_matrix(&gl, &projection);
  });
STATE.with_borrow(|p| {
    set_vertex_colors(&gl, &p.get_vertex_colors());
    set_vertex_indices(&gl, &p.get_vertex_indices());
    set_vertex_positions(&gl, &p.get_vertex_positions());
});
  Ok(())
}

fn get_program(context: &WebGlRenderingContext) -> WebGlProgram {
  context
    .get_parameter(WebGlRenderingContext::CURRENT_PROGRAM)
    .unwrap()
    .dyn_into()
    .unwrap()
}

fn compile_shader(
  context: &WebGlRenderingContext,
  shader_type: u32,
  source: &str,
) -> Result<WebGlShader, String> {
  let shader = context
    .create_shader(shader_type)
    .ok_or_else(|| String::from("Unable to create shader object"))?;
  context.shader_source(&shader, source);
  context.compile_shader(&shader);

  if context
    .get_shader_parameter(&shader, WebGlRenderingContext::COMPILE_STATUS)
    .as_bool()
    .unwrap_or(false)
  {
    Ok(shader)
  } else {
    Err(
      context
        .get_shader_info_log(&shader)
        .unwrap_or_else(|| String::from("Unknown error creating shader")),
    )
  }
}

fn link_program(
  context: &WebGlRenderingContext,
  vert_shader: &WebGlShader,
  frag_shader: &WebGlShader,
) -> Result<WebGlProgram, String> {
  let program = context
    .create_program()
    .ok_or_else(|| String::from("Unable to create shader object"))?;

  context.attach_shader(&program, vert_shader);
  context.attach_shader(&program, frag_shader);
  context.link_program(&program);

  if context
    .get_program_parameter(&program, WebGlRenderingContext::LINK_STATUS)
    .as_bool()
    .unwrap_or(false)
  {
    Ok(program)
  } else {
    Err(
      context
        .get_program_info_log(&program)
        .unwrap_or_else(|| String::from("Unknown error creating program object")),
    )
  }
}

fn webgl_context() -> Result<WebGlRenderingContext> {
  let gl = window()
    .ok_or("no window")?
    .document()
    .ok_or("no document")?
    .query_selector("canvas")?
    .ok_or("no canvas")?
    .dyn_into::<HtmlCanvasElement>()?
    .get_context("webgl")?
    .ok_or("no web gl context")?
    .dyn_into::<WebGlRenderingContext>()?;
  Ok(gl)
}

#[allow(dead_code)]
struct State {
  facets: Vec<Facet>,
  camera_transform: Mat4,
  camera_axis: Vec3,
  frame: f32,
  then: f32,
}

impl State {
  fn new() -> Self {
    let mut camera_transform = mat4::create();
    mat4::identity(&mut camera_transform);
    Self {
      camera_transform,
      camera_axis: vec3::create(),
      frame: 0.0,
      then: 0.0,
      facets: Self::init_facets(),
    }
  }

  fn init_facets() -> Vec<Facet> {
    // 8 hexagonal faces
    // each hexagon is split into 3 trapezoid facets and 1 center triangle
    // 6 square faces
    // 4 cross sections
    let mut facets = Vec::with_capacity(4 * 8 + 6 + 4);

    // depth of a square from the center of the puzzle
    let a = 1.5;
    // square sidelength
    let b = 2.0_f32.sqrt() / 2.0;
    let _c = (a + b) / 2.0;
    // border width
    let _w = 0.1;
    let mesh = [
      b, 0., a, //
      0., b, a, //
      -b, 0., a, //
      0., -b, a, //
    ];
    let square1 = Facet {
      normal: [0.0, 0.0, 1.0],
      color: Color::YELLOW,
      mesh: mesh.to_vec(),
    };
    let mut rot_x = mat4::create();
    mat4::from_x_rotation(&mut rot_x, PI / 2.0);

    let mut rot_y = mat4::create();
    mat4::from_y_rotation(&mut rot_y, PI / 2.0);

    let mut square2 = square1.clone();
    square2.transform(&rot_x);
    square2.color = Color::WHITE;

    let mut square3 = square2.clone();
    square3.transform(&rot_x);
    square3.color = Color::MAGENTA;

    let mut square4 = square3.clone();
    square4.transform(&rot_x);
    square4.color = Color::LIGHT_PINK;

    let mut square5 = square1.clone();
    square5.transform(&rot_y);
    square5.color = Color::LIGHT_RED;

    let mut square6 = square3.clone();
    square6.transform(&rot_y);
    square6.color = Color::GREEN;

    facets.push(square1);
    facets.push(square2);
    facets.push(square3);
    facets.push(square4);
    facets.push(square5);
    facets.push(square6);
    facets
  }

  fn get_vertex_count(&self) -> u32 {
    self.facets.iter().map(|f| f.get_vertex_count()).sum()
  }

  fn get_index_count(&self) -> u32 {
    self.facets.iter().map(|f| f.get_index_count()).sum()
  }

  fn get_vertex_indices(&self) -> Uint32Array {
    let mut array = Vec::with_capacity(self.get_index_count() as usize);
    let mut total: u32 = 0;
    for facet in self.facets.iter() {
      let count = facet.get_vertex_count();
      for i in 0..(count - 2) {
        array.push(total);
        array.push(total + i + 1);
        array.push(total + i + 2);
      }
      total += count;
    }
    console::log_3(
      &JsValue::from("array"),
      &JsValue::from(array.capacity()),
      &JsValue::from(array.len()),
    );
    let array = Uint32Array::from(array.as_slice());
    console::log_2(&JsValue::from("array"), &JsValue::from(&array));
    array
  }

  fn get_vertex_colors(&self) -> Float32Array {
    // n vertices times 4 rgba values
    let mut array = Vec::with_capacity(4 * self.get_vertex_count() as usize);
    for facet in self.facets.iter() {
      for _ in 0..facet.get_vertex_count() {
        array.push(facet.color.0[0]);
        array.push(facet.color.0[1]);
        array.push(facet.color.0[2]);
        array.push(facet.color.0[3]);
      }
    }

    let array = Float32Array::from(array.as_slice());
    console::log_2(&JsValue::from("colors"), &JsValue::from(&array));
    array
  }

  fn get_vertex_positions(&self) -> Float32Array {
    let mut vector = vec![0.0; self.get_vertex_count() as usize * 3];

    let mut offset = 0;
    for facet in self.facets.iter() {
      console::log_4(
        &JsValue::from("color"),
        &JsValue::from(&Float32Array::from(facet.color.0.as_slice())),
        &JsValue::from("mesh"),
        &JsValue::from(&Float32Array::from(facet.mesh.as_slice())),
      );
      vector[offset..(offset + facet.mesh.len())].copy_from_slice(&facet.mesh);
      offset += facet.mesh.len();
    }

    let array = Float32Array::from(vector.as_slice());
    console::log_2(&JsValue::from("positions"), &JsValue::from(&array));
    array
  }
}

/*
struct Point([f32; 3]);
impl Point {
  fn write_to(&self, array: &Float32Array, start: u32) {
    Float32Array::set_index(array, start, self.0[0]);
    Float32Array::set_index(array, start + 1, self.0[1]);
    Float32Array::set_index(array, start + 2, self.0[2]);
  }
}
*/

#[derive(Clone)]
struct Facet {
  mesh: Vec<f32>,
  normal: Vec3,
  color: Color,
}

impl Facet {
  fn transform(&mut self, matrix: &Mat4) {
    let mut temp = [0.0_f32; 3];
    vec3::transform_mat4(&mut temp, &self.normal, matrix);
    self.normal = temp;

    let n = self.mesh.len() / 3;

    for i in 0..n {
      let slice: &mut [f32] = self.mesh[3 * i..3 * i + 3].borrow_mut();
      vec3::transform_mat4(&mut temp, &slice.try_into().unwrap(), matrix);
      slice.copy_from_slice(temp.as_slice());
    }
  }

  fn get_vertex_count(&self) -> u32 {
    self.mesh.len() as u32 / 3
  }

  fn get_index_count(&self) -> u32 {
    3 * (self.get_vertex_count() - 2)
  }
}

#[derive(Clone)]
struct Color([f32; 4]);

#[allow(dead_code)]
impl Color {
  const fn rgb(red: u8, green: u8, blue: u8) -> Self {
    Color([
      red as f32 / 255.0,
      green as f32 / 255.0,
      blue as f32 / 255.0,
      1.0,
    ])
  }

  fn write_to(&self, array: &Float32Array, start: u32) {
    Float32Array::set_index(array, start, self.0[0]);
    Float32Array::set_index(array, start + 1, self.0[1]);
    Float32Array::set_index(array, start + 2, self.0[2]);
    Float32Array::set_index(array, start + 3, self.0[3]);
  }

  const MAGENTA: Self = Self::rgb(210, 75, 208);
  const SILVER: Self = Self::rgb(143, 143, 143);
  const BLUE_VIOLET: Self = Self::rgb(119, 153, 252);
  const SKY_BLUE: Self = Self::rgb(135, 206, 235);
  const WHITE: Self = Self::rgb(212, 241, 252);
  const LIGHT_GREEN: Self = Self::rgb(221, 250, 220);
  const CORAL: Self = Self::rgb(244, 79, 130);
  const RED: Self = Self::rgb(173, 25, 2);
  const LIGHT_RED: Self = Self::rgb(232, 173, 191);
  const LIGHT_PINK: Self = Self::rgb(252, 222, 255);
  const LIGHT_PURPLE: Self = Self::rgb(196, 173, 234);
  const CYAN: Self = Self::rgb(12, 249, 239);
  const TEAL: Self = Self::rgb(33, 209, 163);
  const VIOLET: Self = Self::rgb(94, 79, 160);
  const YELLOW: Self = Self::rgb(178, 201, 43);
  const BLUE: Self = Self::rgb(41, 67, 163);
  const GREEN: Self = Self::rgb(35, 118, 49);
  const ORANGE: Self = Self::rgb(235, 135, 21);
}

fn set_vertex_positions(gl: &WebGlRenderingContext, positions: &Float32Array) {
  let program = get_program(gl);
  let buffer = gl.create_buffer();
  gl.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, buffer.as_ref());
  gl.buffer_data_with_opt_array_buffer(
    WebGlRenderingContext::ARRAY_BUFFER,
    Some(&positions.buffer()),
    WebGlRenderingContext::STATIC_DRAW,
  );

  let attribute_index = gl.get_attrib_location(&program, "vertexPosition") as u32;
  let num_components = 3;
  let array_type = WebGlRenderingContext::FLOAT;
  let normalize = false;
  let stride = 0;
  let offset = 0;
  gl.vertex_attrib_pointer_with_i32(
    attribute_index,
    num_components,
    array_type,
    normalize,
    stride,
    offset,
  );
  gl.enable_vertex_attrib_array(attribute_index);
}

fn set_vertex_colors(gl: &WebGlRenderingContext, colors: &Float32Array) {
  let program = get_program(gl);
  let buffer = gl.create_buffer();
  gl.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, buffer.as_ref());
  gl.buffer_data_with_opt_array_buffer(
    WebGlRenderingContext::ARRAY_BUFFER,
    Some(&colors.buffer()),
    WebGlRenderingContext::DYNAMIC_DRAW,
  );

  let attribute_index = gl.get_attrib_location(&program, "vertexColor") as u32;
  let num_components = 4;
  let array_type = WebGlRenderingContext::FLOAT;
  let normalize = false;
  let stride = 0;
  let offset = 0;
  gl.vertex_attrib_pointer_with_i32(
    attribute_index,
    num_components,
    array_type,
    normalize,
    stride,
    offset,
  );
  gl.enable_vertex_attrib_array(attribute_index);
}

fn set_vertex_indices(gl: &WebGlRenderingContext, indices: &Uint32Array) {
  let buffer = gl.create_buffer();
  gl.bind_buffer(WebGlRenderingContext::ELEMENT_ARRAY_BUFFER, buffer.as_ref());
  gl.buffer_data_with_opt_array_buffer(
    WebGlRenderingContext::ELEMENT_ARRAY_BUFFER,
    Some(&indices.buffer()),
    WebGlRenderingContext::DYNAMIC_DRAW,
  );
}

/* This is used for the camera
 * (maybe also for pieces rotation? )
 * */
fn set_transform_matrix(gl: &WebGlRenderingContext, matrix: &Mat4) {
  let program = get_program(gl);
  gl.uniform_matrix4fv_with_f32_array(
    gl.get_uniform_location(&program, "transformMatrix")
      .as_ref(),
    false,
    matrix,
  )
}

fn get_projection_matrix(gl: &WebGlRenderingContext, dest: &mut Mat4) {
  let canvas: HtmlElement = gl.canvas().unwrap().dyn_into::<HtmlElement>().unwrap();
  let fov = (45.0 * std::f64::consts::PI as f32) / 180.0;
  let aspect = canvas.client_width() as f32 / canvas.client_height() as f32;
  let near = 0.1;
  let far = 100.0;
  let mut p = mat4::create();
  mat4::perspective(&mut p, fov, aspect, near, Some(far));
  let mut t = mat4::create();
  mat4::from_translation(&mut t, &[0.0, 0.0, -6.0]);
  mat4::multiply(dest, &p, &t);
}

fn clear_scene(gl: &WebGlRenderingContext) {
  gl.clear_color(0.0, 0.0, 0.0, 1.0);
  gl.clear_depth(1.0);
  gl.enable(WebGlRenderingContext::DEPTH_TEST);
  gl.depth_func(WebGlRenderingContext::LEQUAL);
  gl.clear(WebGlRenderingContext::COLOR_BUFFER_BIT | WebGlRenderingContext::DEPTH_BUFFER_BIT);
}

fn resize_to_screen(gl: &WebGlRenderingContext) {
  let canvas = gl
    .canvas()
    .unwrap()
    .dyn_into::<HtmlCanvasElement>()
    .unwrap();
  canvas.set_height(canvas.client_height() as u32);
  canvas.set_width(canvas.client_width() as u32);
  gl.viewport(0, 0, canvas.client_width(), canvas.client_height());
}
