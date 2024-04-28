import { run } from "./center-cuts";
import init from "../wasm/pkg/look_how_they_truncated_my_boy.js";


init().then(() => {
  const canvas = document.querySelector("#webgl-root")! as HTMLCanvasElement;
  const gl = canvas.getContext("webgl")!;

  run(gl);

});
