use anyhow::{anyhow, bail, Result};
use wasm_bindgen::prelude::*;
use web_sys::{window, Document, HtmlCanvasElement, WebGlRenderingContext};

#[wasm_bindgen]
extern {
  #[wasm_bindgen(js_namespace = console)]
  fn log(s: &str);

  #[wasm_bindgen(js_namespace = console)]
  fn error(s: &str);
}


pub fn webgl_context() -> Result<WebGlRenderingContext> {
  window()
    .ok_or(anyhow!("no window"))?
    .document()
    .ok_or(anyhow!("no document"))?
    .query_selector("#webgl-root")
    .map_err(|e| anyhow!("{:#?}", e))?
    .ok_or(anyhow!("no element with id webgl-root"))?
    .dyn_into::<HtmlCanvasElement>()
    .map_err(|e| anyhow!("{:#?}", e))?
    .get_context("webgl")
    .map_err(|e| anyhow!("{:#?}", e))?
    .ok_or(anyhow!("no web gl context"))?
    .dyn_into::<WebGlRenderingContext>()
    .map_err(|e| anyhow!("{:#?}", e))
}

#[wasm_bindgen]
pub fn main() {
  log(&format!("Main"));
  webgl_context().unwrap();
}
