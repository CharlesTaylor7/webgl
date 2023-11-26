import { mat4 } from "gl-matrix";
import { initShaderProgram } from "./utils";

const default3DVertexShader = `
  attribute vec4 vertexPosition;
  attribute vec4 vertexColor;

  uniform mat4 transformMatrix;

  varying lowp vec4 fragmentColor;

  void main(void) {
    gl_Position = transformMatrix * vertexPosition;
    fragmentColor = vertexColor;
  }
`;

const default3DFragmentShader = `
  varying lowp vec4 fragmentColor;

  void main(void) {
    gl_FragColor = fragmentColor;
  }
`;

export function drawElements(
  gl: WebGLRenderingContext,
  mode: GLenum,
  offset: number,
  count: number,
) {
  gl.drawElements(mode, count, gl.UNSIGNED_SHORT, 2 * offset);
}

export function default3DShaderProgram(
  gl: WebGLRenderingContext,
): WebGLProgram {
  return initShaderProgram(gl, {
    vertex: default3DVertexShader,
    fragment: default3DFragmentShader,
  });
}

export function setVertexPositions(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  positions: Float32Array,
) {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const attributeIndex = gl.getAttribLocation(program, "vertexPosition");
  const numComponents = 3;
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
