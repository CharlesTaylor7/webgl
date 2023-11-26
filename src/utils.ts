import { mat4 } from "gl-matrix";

export type ProgramSource = {
  vertex: string;
  fragment: string;
};

export function clearScene(gl: WebGLRenderingContext) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

export function initShaderProgram(
  gl: WebGLRenderingContext,
  source: ProgramSource,
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, source.vertex);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, source.fragment);

  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)!;
    gl.deleteProgram(program);
    throw new Error(info);
  }
  gl.useProgram(program);

  return program;
}

export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const message = gl.getShaderInfoLog(shader);
  if (message) {
    console.log(source);
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

export function positionsOfUnity(n: number) {
  const angle = (2 * Math.PI) / n;
  const positions: number[] = [];
  for (let i = 0; i < n; i++) {
    positions.push(Math.cos(angle * i), Math.sin(angle * i));
  }
  return positions;
}

export function resizeToScreen(gl: WebGLRenderingContext) {
  const canvas = gl.canvas as HTMLCanvasElement;

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

const t = mat4.create();
mat4.fromTranslation(t, [0, 0, -6]);

export function getDefaultProjectionMatrix(
  gl: WebGLRenderingContext,
  dest: mat4,
) {
  const canvas = gl.canvas as HTMLCanvasElement;
  const fieldOfView = (45 * Math.PI) / 180;
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  mat4.perspective(dest, fieldOfView, aspect, zNear, zFar);
  mat4.multiply(dest, dest, t);
}

export type Color = [number, number, number, number];

export function randomColor(): Color {
  return [Math.random(), Math.random(), Math.random(), 1];
}

export function rgb(red: number, green: number, blue: number): Color {
  return [red / 255, green / 255, blue / 255, 1.0];
}
