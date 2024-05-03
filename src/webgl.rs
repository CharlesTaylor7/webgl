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

// todo
// piece collections
// animation
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
    ("w", Command::camera(Orientation::Negative, Axis::X)),
    ("a", Command::camera(Orientation::Negative, Axis::Y)),
    ("s", Command::camera(Orientation::Positive, Axis::X)),
    ("d", Command::camera(Orientation::Positive, Axis::Y)),
    ("q", Command::camera(Orientation::Positive, Axis::Z)),
    ("e", Command::camera(Orientation::Negative, Axis::Z)),
    ("h", Command::twist(true, true, true)),
    ("j", Command::twist(true, false, true)),
    ("k", Command::twist(false, false, true)),
    ("l", Command::twist(false, true, true)),
    ("y", Command::twist(true, true, false)),
    ("u", Command::twist(true, false, false)),
    ("i", Command::twist(false, false, false)),
    ("o", Command::twist(false, true, false)),
  ])
}

fn init_projection() -> Mat4 {
  let gl = webgl_context().unwrap();
  let mut m = mat4::create();
  get_projection_matrix(&gl, &mut m);
  m
}

type Result<T, E = JsValue> = std::result::Result<T, E>;

type Keymap = HashMap<&'static str, Command>;
enum Axis {
  X,
  Y,
  Z,
}
enum Orientation {
  Positive,
  Negative,
}
enum Command {
  Camera {
    axis: Axis,
    orientation: Orientation,
  },
  Twist {
    // bit pattern.
    // first bit is the x axis,
    // second bit is the y axis,
    // third bit is the z axis
    octant: u8,
  },
}
impl Command {
  fn camera(orientation: Orientation, axis: Axis) -> Self {
    Self::Camera { orientation, axis }
  }

  fn twist(x: bool, y: bool, z: bool) -> Self {
    let mut octant = 0;
    if x {
      octant |= 1
    }
    if y {
      octant |= 2
    }
    if z {
      octant |= 4
    }
    Self::Twist { octant }
  }
}

const ANIMATION_DURATION: f32 = 400.0;

// it takes 1.6 seconds to rotate the camera 120 degrees
const CAMERA_SPEED: f32 = (2.0 * std::f32::consts::PI) / (3.0 * 1600.0);

#[wasm_bindgen]
pub fn render(ms: f32) -> Result<()> {
  let gl = webgl_context()?;

  STATE.with_borrow_mut(|p| {
    let delta = ms - p.then;
    p.then = ms;
    if p.active_twist.is_some() {
      p.frame += delta;
      console_log(delta);
      if p.frame > ANIMATION_DURATION {
        p.complete_twist();
      }
    }

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

    set_vertex_positions(&gl, &p.get_vertex_positions());
    set_vertex_colors(&gl, &p.get_vertex_colors());
    set_vertex_indices(&gl, &p.get_vertex_indices());

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
      if let Some(command) = keymap.get(b) {
        match command {
          Command::Camera { axis, orientation } => {
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
          Command::Twist { octant } => {
            if state.active_twist.is_none() {
              state.active_twist = Some(Twist::Center { octant: *octant });
            }
          }
        }
      }
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
      if let Some(Command::Camera { axis, .. }) = keymap.get(b) {
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
  if cfg!(debug_assertions) {
    use console_error_panic_hook;
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
  }

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

#[derive(Clone, Copy, Debug)]
enum Twist {
  Center { octant: u8 },
  Side { hexagon: () /* todo */ },
}
impl Twist {
  fn to_normal(&self) -> Vec3 {
    match self {
      Twist::Side { .. } => todo!(),
      Twist::Center { octant } => {
        let mut axis = [-1., -1., -1.];
        if octant & 1 != 0 {
          axis[0] = 1.;
        }

        if octant & 2 != 0 {
          axis[1] = 1.;
        }

        if octant & 4 != 0 {
          axis[2] = 1.;
        }
        axis
      }
    }
  }

  fn to_matrix(&self, angle: f32) -> Mat4 {
    let mut matrix = mat4::create();
    mat4::from_rotation(&mut matrix, angle, &self.to_normal());
    matrix
  }
}

#[derive(Debug)]
struct Piece {
  pub normal: Vec3,
  pub facets: Vec<Facet>,
}

impl From<Facet> for Piece {
  fn from(value: Facet) -> Self {
    Self {
      normal: value.normal,
      facets: vec![value],
    }
  }
}
impl Piece {
  fn transform(&mut self, matrix: &Mat4) {
    let mut temp = [0.; 3];
    vec3::transform_mat4(&mut temp, &self.normal, matrix);
    self.normal = temp;
    for facet in self.facets.iter_mut() {
      facet.transform(matrix);
    }
  }
}

#[derive(Debug)]
struct State {
  camera_transform: Mat4,
  camera_axis: Vec3,
  frame: f32,
  then: f32,
  pieces: Vec<Piece>,
  active_twist: Option<Twist>,
}

impl State {
  fn new() -> Self {
    let mut camera_transform = mat4::create();
    mat4::identity(&mut camera_transform);
    let pieces = Self::init_pieces();
    Self {
      camera_transform,
      camera_axis: vec3::create(),
      frame: 0.0,
      then: 0.0,
      active_twist: None,
      pieces,
    }
  }

  fn complete_twist(&mut self) {
    self.frame = 0.;
    if let Some(twist) = self.active_twist.take() {
      let normal = twist.to_normal();
      let twist = twist.to_matrix(2. * PI / 3.);
      for piece in self.pieces.iter_mut() {
        if vec3::dot(&normal, &piece.normal) > 0. {
          piece.transform(&twist)
        }
      }
    }
  }

  fn facets(&self) -> impl Iterator<Item = &Facet> {
    self.pieces.iter().flat_map(|p| p.facets.iter())
  }

  fn init_pieces() -> Vec<Piece> {
    // 8 hexagonal faces
    // each hexagon is split into 3 trapezoid facets and 1 center triangle
    // 6 square faces
    // 4 cross sections
    let mut pieces = Vec::with_capacity(6 + 8);

    // depth of a square from the center of the puzzle
    let a = 1.5;
    // square sidelength
    let b = 2.0_f32.sqrt() / 2.0;
    let c = (a + b) / 2.0;
    // border width
    let w = 0.1;

    let mut rot_x = mat4::create();
    mat4::from_x_rotation(&mut rot_x, PI / 2.0);

    let mut rot_y = mat4::create();
    mat4::from_y_rotation(&mut rot_y, PI / 2.0);
    let square1 = Facet {
      normal: [0.0, 0.0, 1.0],
      color: Color::CYAN,
      mesh: vec![
        b, 0., a, //
        0., b, a, //
        -b, 0., a, //
        0., -b, a, //
      ],
    };

    let square2 = square1.clone_with(&rot_x, Color::VIOLET);
    let square3 = square2.clone_with(&rot_x, Color::LIGHT_RED);
    let square4 = square3.clone_with(&rot_x, Color::BLUE_VIOLET);
    let square5 = square1.clone_with(&rot_y, Color::TEAL);
    let square6 = square3.clone_with(&rot_y, Color::SKY_BLUE);

    let triangle1 = Facet {
      color: Color::SILVER,
      normal: [1., 1., 1.],
      mesh: vec![
        c, 0., c, //
        0., c, c, //
        c, c, 0., //
      ],
    };

    let triangle2 = triangle1.clone_with(&rot_x, Color::WHITE);
    let triangle3 = triangle2.clone_with(&rot_x, Color::ORANGE);
    let triangle4 = triangle3.clone_with(&rot_x, Color::BLUE);
    let triangle5 = triangle3.clone_with(&rot_y, Color::MAGENTA);
    let triangle6 = triangle4.clone_with(&rot_y, Color::YELLOW);
    let triangle7 = triangle5.clone_with(&rot_y, Color::GREEN);
    let triangle8 = triangle6.clone_with(&rot_y, Color::CORAL);

    let trapezoid1a = Facet {
      color: Color::SILVER,
      normal: [1., 1., 1.],
      mesh: vec![
        c, 0., c, //
        0., c, c, //
        0., b, a, //
        b, 0., a, //
      ],
    };

    let mut rot_oct1 = mat4::create();
    mat4::from_rotation(&mut rot_oct1, 2.0 * PI / 3.0, &[1., 1., 1.]);
    let trapezoid1b = trapezoid1a.clone_with(&rot_oct1, Color::SILVER);
    let trapezoid1c = trapezoid1b.clone_with(&rot_oct1, Color::SILVER);

    let trapezoid2a = trapezoid1a.clone_with(&rot_x, Color::WHITE);
    let trapezoid2b = trapezoid1b.clone_with(&rot_x, Color::WHITE);
    let trapezoid2c = trapezoid1c.clone_with(&rot_x, Color::WHITE);

    let trapezoid3a = trapezoid2a.clone_with(&rot_x, Color::ORANGE);
    let trapezoid3b = trapezoid2b.clone_with(&rot_x, Color::ORANGE);
    let trapezoid3c = trapezoid2c.clone_with(&rot_x, Color::ORANGE);

    let trapezoid4a = trapezoid3a.clone_with(&rot_x, Color::BLUE);
    let trapezoid4b = trapezoid3b.clone_with(&rot_x, Color::BLUE);
    let trapezoid4c = trapezoid3c.clone_with(&rot_x, Color::BLUE);

    let trapezoid5a = trapezoid3a.clone_with(&rot_y, Color::MAGENTA);
    let trapezoid5b = trapezoid3b.clone_with(&rot_y, Color::MAGENTA);
    let trapezoid5c = trapezoid3c.clone_with(&rot_y, Color::MAGENTA);

    let trapezoid6a = trapezoid4a.clone_with(&rot_y, Color::YELLOW);
    let trapezoid6b = trapezoid4b.clone_with(&rot_y, Color::YELLOW);
    let trapezoid6c = trapezoid4c.clone_with(&rot_y, Color::YELLOW);

    let trapezoid7a = trapezoid5a.clone_with(&rot_y, Color::GREEN);
    let trapezoid7b = trapezoid5b.clone_with(&rot_y, Color::GREEN);
    let trapezoid7c = trapezoid5c.clone_with(&rot_y, Color::GREEN);

    let trapezoid8a = trapezoid6a.clone_with(&rot_y, Color::CORAL);
    let trapezoid8b = trapezoid6b.clone_with(&rot_y, Color::CORAL);
    let trapezoid8c = trapezoid6c.clone_with(&rot_y, Color::CORAL);

    pieces.push(Piece {
      normal: square1.normal,
      facets: vec![square1, trapezoid1a, trapezoid2c, trapezoid7a, trapezoid8c],
    });
    pieces.push(Piece {
      normal: square2.normal,
      facets: vec![square2, trapezoid2a, trapezoid7c, trapezoid3c, trapezoid5c],
    });
    pieces.push(Piece {
      normal: square3.normal,
      facets: vec![square3, trapezoid3a, trapezoid5b, trapezoid4c, trapezoid6b],
    });
    pieces.push(Piece {
      normal: square4.normal,
      facets: vec![square4, trapezoid4a, trapezoid6a, trapezoid1c, trapezoid8a],
    });
    pieces.push(Piece {
      normal: square5.normal,
      facets: vec![square5, trapezoid1b, trapezoid3b, trapezoid2b, trapezoid4b],
    });
    pieces.push(Piece {
      normal: square6.normal,
      facets: vec![square6, trapezoid5a, trapezoid6c, trapezoid7b, trapezoid8b],
    });

    pieces.push(triangle1.into());
    pieces.push(triangle2.into());
    pieces.push(triangle3.into());
    pieces.push(triangle4.into());
    pieces.push(triangle5.into());
    pieces.push(triangle6.into());
    pieces.push(triangle7.into());
    pieces.push(triangle8.into());
    pieces
  }

  fn get_vertex_count(&self) -> u32 {
    self.facets().map(|f| f.get_vertex_count()).sum()
  }

  fn get_index_count(&self) -> u32 {
    self.facets().map(|f| f.get_index_count()).sum()
  }

  fn get_vertex_indices(&self) -> Uint32Array {
    let mut array = Vec::with_capacity(self.get_index_count() as usize);
    let mut total: u32 = 0;
    for facet in self.facets() {
      let count = facet.get_vertex_count();
      for i in 0..(count - 2) {
        array.push(total);
        array.push(total + i + 1);
        array.push(total + i + 2);
      }
      total += count;
    }
    let array = Uint32Array::from(array.as_slice());
    array
  }

  fn get_vertex_colors(&self) -> Float32Array {
    // n vertices times 4 rgba values
    let mut array = Vec::with_capacity(4 * self.get_vertex_count() as usize);
    for facet in self.facets() {
      for _ in 0..facet.get_vertex_count() {
        array.push(facet.color.red());
        array.push(facet.color.green());
        array.push(facet.color.blue());
        array.push(facet.color.alpha());
      }
    }

    let array = Float32Array::from(array.as_slice());
    console::log_2(&JsValue::from("colors"), &JsValue::from(&array));
    array
  }

  fn get_vertex_positions(&self) -> Float32Array {
    let mut vector = vec![0.0; self.get_vertex_count() as usize * 3];
    let mut offset = 0;

    // slow path
    if let Some(twist) = self.active_twist {
      let normal = twist.to_normal();
      for piece in self.pieces.iter() {
        for facet in piece.facets.iter() {
          let data: &mut [f32] = vector[offset..(offset + facet.mesh.len())].borrow_mut();
          data.copy_from_slice(&facet.mesh);

          if vec3::dot(&normal, &piece.normal) > 0. {
            console_log(true);
            let mut mesh = Mesh { data };
            let angle = ((2. * PI) / 3.) * (self.frame / ANIMATION_DURATION);
            mesh.transform(&twist.to_matrix(angle));
          }
          offset += facet.mesh.len();
        }
      }
    }
    // fast path
    else {
      for facet in self.facets() {
        vector[offset..(offset + facet.mesh.len())].copy_from_slice(&facet.mesh);
        offset += facet.mesh.len();
      }
    }

    let array = Float32Array::from(vector.as_slice());
    console::log_2(&JsValue::from("positions"), &JsValue::from(&array));
    array
  }
}

#[derive(Debug, Clone)]
struct Facet {
  mesh: Vec<f32>,
  normal: Vec3,
  color: Color,
}

impl Facet {
  fn clone_with(&self, matrix: &Mat4, color: Color) -> Facet {
    let mut facet = self.clone();
    facet.transform(matrix);
    facet.color = color;
    facet
  }
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

#[derive(Debug, Clone)]
struct Color {
  red: u8,
  green: u8,
  blue: u8,
  alpha: f32,
}

impl Color {
  const fn rgb(red: u8, green: u8, blue: u8) -> Self {
    Color {
      red,
      green,
      blue,
      alpha: 1.,
    }
  }
  const fn rgba(red: u8, green: u8, blue: u8, alpha: f32) -> Self {
    Color {
      red,
      green,
      blue,
      alpha,
    }
  }

  fn red(&self) -> f32 {
    f32::from(self.red) / 255.
  }

  fn green(&self) -> f32 {
    f32::from(self.green) / 255.
  }

  fn blue(&self) -> f32 {
    f32::from(self.blue) / 255.
  }

  fn alpha(&self) -> f32 {
    self.alpha
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

struct Mesh<'a> {
  data: &'a mut [f32],
}

impl<'a> Mesh<'a> {
  fn transform(&mut self, matrix: &Mat4) {
    let mut temp = [0.0_f32; 3];

    for i in 0..self.data.len() / 3 {
      // safe because the types guarantee the array size is a multiple of 3;
      let slice: &mut [f32] = self.data[3 * i..3 * (i + 1)].borrow_mut();
      vec3::transform_mat4(&mut temp, &slice.try_into().unwrap(), matrix);
      slice.copy_from_slice(temp.as_slice());
    }
  }
}

fn console_log<T: std::fmt::Debug>(obj: T) {
  console::log_1(&JsValue::from(format!("{:#?}", obj)));
}

/*
struct Mesh<const N: usize>
where
  [f32; 3 * N]: Sized,
{
  data: [f32; 3 * N],
}

impl<const N: usize> Mesh<N>
where
  [f32; 3 * N]: Sized,
{
  fn transform(&mut self, matrix: &Mat4) {
    let mut temp = [0.0_f32; 3];

    for i in 0..N {
      // safe because the types guarantee the array size is a multiple of 3;
      let slice: &mut [f32] = self.data[3 * i..3 * (i + 1)].borrow_mut();
      vec3::transform_mat4(&mut temp, &slice.try_into().unwrap(), matrix);
      slice.copy_from_slice(temp.as_slice());
    }
  }
}
*/
