#![feature(const_fn_floating_point_arithmetic)]
#![allow(dead_code)]
use std::cell::RefCell;
use wasm_bindgen::prelude::*;
use web_sys::js_sys::{Float32Array, Uint16Array};
use web_sys::{
  console, window, HtmlCanvasElement, WebGlProgram, WebGlRenderingContext, WebGlShader,
};

/* TODO
 * port web gl utils
 * derive piece geometry from normals
 *
 */

thread_local! {
    pub static PUZZLE: RefCell<Puzzle> = RefCell::new(Puzzle::new());
}

#[wasm_bindgen]
pub fn render(ms: f64) {
  console::log_2(&JsValue::from("Hello"), &JsValue::from(ms));
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
fn start() -> Result<(), JsValue> {
  let context = webgl_context();
  console::log_1(&context);

  let vert_shader = compile_shader(
    &context,
    WebGlRenderingContext::VERTEX_SHADER,
    VERTEX_SHADER,
  )?;

  let frag_shader = compile_shader(
    &context,
    WebGlRenderingContext::FRAGMENT_SHADER,
    FRAGMENT_SHADER,
  )?;
  let program = link_program(&context, &vert_shader, &frag_shader)?;
  context.use_program(Some(&program));
  Ok(())
  /*

      let vertices: [f32; 9] = [-0.7, -0.7, 0.0, 0.7, -0.7, 0.0, 0.0, 0.7, 0.0];

      let position_attribute_location = context.get_attrib_location(&program, "position");
      let buffer = context.create_buffer().ok_or("Failed to create buffer")?;
      context.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&buffer));

      // Note that `Float32Array::view` is somewhat dangerous (hence the
      // `unsafe`!). This is creating a raw view into our module's
      // `WebAssembly.Memory` buffer, but if we allocate more pages for ourself
      // (aka do a memory allocation in Rust) it'll cause the buffer to change,
      // causing the `Float32Array` to be invalid.
      //
      // As a result, after `Float32Array::view` we have to be very careful not to
      // do any memory allocations before it's dropped.
      unsafe {
          let positions_array_buf_view = js_sys::Float32Array::view(&vertices);

          context.buffer_data_with_array_buffer_view(
              WebGl2RenderingContext::ARRAY_BUFFER,
              &positions_array_buf_view,
              WebGl2RenderingContext::STATIC_DRAW,
          );
      }

      let vao = context
          .create_vertex_array()
          .ok_or("Could not create vertex array object")?;
      context.bind_vertex_array(Some(&vao));

      context.vertex_attrib_pointer_with_i32(
          position_attribute_location as u32,
          3,
          WebGl2RenderingContext::FLOAT,
          false,
          0,
          0,
      );
      context.enable_vertex_attrib_array(position_attribute_location as u32);

      context.bind_vertex_array(Some(&vao));

      let vert_count = (vertices.len() / 3) as i32;
      draw(&context, vert_count);
  */
}

fn get_program(context: &WebGlRenderingContext) -> WebGlProgram {
  context
    .get_parameter(WebGlRenderingContext::CURRENT_PROGRAM)
    .unwrap()
    .dyn_into()
    .unwrap()
}

fn draw(context: &WebGlRenderingContext, vert_count: i32) {
  context.clear_color(0.0, 0.0, 0.0, 1.0);
  context.clear(WebGlRenderingContext::COLOR_BUFFER_BIT);
  context.draw_arrays(WebGlRenderingContext::TRIANGLES, 0, vert_count);
}

pub fn compile_shader(
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

pub fn link_program(
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

pub fn webgl_context() -> WebGlRenderingContext {
  window()
    .expect("no window")
    .document()
    .expect("no document")
    .query_selector("#webgl-root")
    .unwrap()
    .expect("no element with id webgl-root")
    .dyn_into::<HtmlCanvasElement>()
    .unwrap()
    .get_context("webgl")
    .expect("no web gl context")
    .unwrap()
    .dyn_into::<WebGlRenderingContext>()
    .unwrap()
}

struct Puzzle {
  pub facets: Vec<Facet>,
}

impl Puzzle {
  pub fn new() -> Self {
    Self { facets: vec![] }
  }

  pub fn get_vertex_indices(&self) -> Uint16Array {
    let array = Uint16Array::new_with_length(3);
    // 3 vertices
    Uint16Array::set_index(&array, 0, 0);
    Uint16Array::set_index(&array, 1, 1);
    Uint16Array::set_index(&array, 2, 2);
    array
  }

  pub fn get_vertex_colors(&self) -> Float32Array {
    use web_sys::js_sys::Float32Array;
    // 3 vertices times 4 rgba values
    let array = Float32Array::new_with_length(3 * 4);
    Color::MAGENTA.write_to(&array, 0);
    Color::MAGENTA.write_to(&array, 4);
    Color::MAGENTA.write_to(&array, 8);
    array
  }

  pub fn get_vertex_positions(&self) -> Float32Array {
    // 3 vertices with 3 dimensions
    let array = Float32Array::new_with_length(3 * 3);
    Point([0.0, 0.0, 0.0]).write_to(&array, 0);
    Point([0.0, 1.0, 0.0]).write_to(&array, 3);
    Point([1.0, 0.0, 0.0]).write_to(&array, 6);
    array
  }
}
pub struct Matrix {
  array: [f32; 16],
}
impl Matrix {
  pub fn perspective(&mut self, fovy: f32, aspect: f32, near: f32, far: f32) {
    let f = 1.0 / (fovy / 2.0).tan();
    let nf = 1.0 / (near - far);
    self.array.fill(0.0);
    self.array[0] = f / aspect;
    self.array[5] = f;
    self.array[10] = (far + near) * nf;
    self.array[11] = -1.0;
    self.array[14] = 2.0 * far * near * nf;
  }
}

pub struct Point([f32; 3]);
impl Point {
  pub fn write_to(&self, array: &Float32Array, start: u32) {
    Float32Array::set_index(array, start, self.0[0]);
    Float32Array::set_index(array, start + 1, self.0[1]);
    Float32Array::set_index(array, start + 2, self.0[2]);
  }
}

pub struct Facet {
  pub mesh: Float32Array,
  pub normal: Vec3,
  pub color: Color,
}

pub struct Vec3([f32; 3]);
pub struct Color([f32; 4]);

impl Color {
  pub const fn rgb(red: u8, green: u8, blue: u8) -> Self {
    Color([
      red as f32 / 255.0,
      green as f32 / 255.0,
      blue as f32 / 255.0,
      1.0,
    ])
  }

  pub fn write_to(&self, array: &Float32Array, start: u32) {
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

fn set_vertex_positions(gl: &WebGlRenderingContext, positions: Float32Array) {
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

/*
function indexPattern(polygons: Facet[]): Uint16Array {
  const indices: number[] = [];
  let total = 0;
  for (let p of polygons) {
    const vertexCount = p.points.length;
    for (let i = 0; i < vertexCount - 2; i++) {
      indices.push(total, total + i + 1, total + i + 2);
    }
    total += vertexCount;
  }

  return new Uint16Array(indices);
}

*/
/*
export function setVertexIndices(
  gl: WebGLRenderingContext,
  indices: Uint16Array,
  usage: GLenum = gl.STATIC_DRAW,
) {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, usage);
}

export function setVertexColors(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  colors: Float32Array,
) {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);

  const attributeIndex = gl.getAttribLocation(program, "vertexColor");
  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.vertexAttribPointer(
    attributeIndex,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(attributeIndex);
}

export function setTransformMatrix(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  matrix: mat4,
) {
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "transformMatrix"),
    false,
    matrix,
  );
}
*/
