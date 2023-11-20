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
