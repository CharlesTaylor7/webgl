import { mat4 } from "gl-matrix";
import { initShaderProgram } from "./utils";

declare const __brand: unique symbol;
export type Branded<T, B> = T & { [__brand]: B };

type ShaderProgramNeeds<Keys> = Branded<WebGLProgram, Keys>;

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

export function setVertexIndices<K>(
  gl: WebGLRenderingContext,
  program: ShaderProgramNeeds<K>,
  indices: Uint16Array,
  usage: GLenum = gl.STATIC_DRAW,
): ShaderProgramNeeds<Exclude<K, "vertexIndices">> {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, usage);

  // @ts-ignore
  return program;
}

export function drawElements(
  gl: WebGLRenderingContext,
  // @ts-ignore
  program: ShaderProgramNeeds<never>,
  mode: GLenum,
  offset: number,
  count: number,
) {
  gl.drawElements(mode, count, gl.UNSIGNED_SHORT, 2 * offset);
}

export function default3DShaderProgram(
  gl: WebGLRenderingContext,
): ShaderProgramNeeds<
  | "vertexPosition"
  | "vertexColor"
  | "vertexIndices"
  | "transformMatrix"
> {
  const program: WebGLProgram = initShaderProgram(gl, {
    vertex: default3DVertexShader,
    fragment: default3DFragmentShader,
  });

  // @ts-ignore
  return program;
}

export function setVertexPositions<K>(
  gl: WebGLRenderingContext,
  program: ShaderProgramNeeds<K>,
  positions: Float32Array,
): ShaderProgramNeeds<Exclude<K, "vertexPosition">> {
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

  // @ts-ignore
  return program;
}

export function setVertexColors<K>(
  gl: WebGLRenderingContext,
  program: ShaderProgramNeeds<K>,
  colors: Float32Array,
): ShaderProgramNeeds<Exclude<K, "vertexColor">> {
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

  // @ts-ignore
  return program;
}

export function setTransformMatrix<K>(
  gl: WebGLRenderingContext,
  program: ShaderProgramNeeds<K>,
  matrix: mat4,
): ShaderProgramNeeds<Exclude<K, "transformMatrix">> {
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "transformMatrix"),
    false,
    matrix,
  );
  // @ts-ignore
  return program;
}
