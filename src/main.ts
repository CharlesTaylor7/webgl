import { run } from "./rotating-octohedron";

const canvas = document.querySelector("#webgl-root")! as HTMLCanvasElement;
const gl = canvas.getContext("webgl")!;

function resizeToScreen(gl: WebGLRenderingContext) {
  const canvas = gl.canvas as HTMLCanvasElement;

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

run(gl);
