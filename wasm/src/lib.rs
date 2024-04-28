#![feature(const_fn_floating_point_arithmetic)]
#![allow(dead_code)]
use wasm_bindgen::prelude::*;
use web_sys::js_sys::{Float32Array, Uint16Array};

#[wasm_bindgen]
extern {
  #[wasm_bindgen(js_name = log, js_namespace = console)]
  fn console_log(s: &str);

  #[wasm_bindgen(js_name = error, js_namespace = console)]
  fn console_error(s: &str);
}
// draw triangle

#[wasm_bindgen]
pub fn get_vertex_indices() -> Uint16Array {
  let array = Uint16Array::new_with_length(3);
  Uint16Array::set_index(&array, 0, 0);
  Uint16Array::set_index(&array, 1, 1);
  Uint16Array::set_index(&array, 2, 2);
  array
}

#[wasm_bindgen]
pub fn get_vertex_colors() -> Float32Array {
  use web_sys::js_sys::Float32Array;
  // 3 vertices times 4 rgba values
  let array = Float32Array::new_with_length(3 * 4);
  Color::MAGENTA.write_to(&array, 0);
  Color::MAGENTA.write_to(&array, 4);
  Color::MAGENTA.write_to(&array, 8);
  array
}

#[wasm_bindgen]
pub fn get_vertex_positions() -> Float32Array {
  Float32Array::new_with_length(3)
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

pub struct Facet {
  pub mesh: Float32Array,
  pub color: Color,
}

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
