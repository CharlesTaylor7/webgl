import { mat4 } from "gl-matrix";
import { initShaderProgram } from "./utils";

declare const __brand: unique symbol;
export type Branded<T, B> = T & { [__brand]: B };

type ShaderProgramNeeds<Keys> = Branded<WebGLProgram, Keys>;

const default3DVertexShader = `
  attribute vec4 vertexPosition;
  attribute vec4 vertexColor;

  uniform mat4 rotationMatrix;
  uniform mat4 projectionMatrix;

  varying lowp vec4 fragmentColor;

  void main(void) {
    gl_Position = projectionMatrix * rotationMatrix * vertexPosition;
    fragmentColor = vertexColor;
  }
`;

const default3DFragmentShader = `
  varying lowp vec4 fragmentColor;

  void main(void) {
    gl_FragColor = fragmentColor;
  }
`;

export function default3DShaderProgram(
  gl: WebGLRenderingContext,
): ShaderProgramNeeds<
  "vertexPosition" | "vertexColor" | "rotationMatrix" | "projectionMatrix"
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
  positionBuffer: Float32Array,
): program is ShaderProgramNeeds<Exclude<K, "vertexPosition">> {
  const numComponents = 3;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  const vertexPosition = gl.getAttribLocation(program, "vertexPosition");
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(
    vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(vertexPosition);
  return true;
}

export function setVertexColors<K>(
  gl: WebGLRenderingContext,
  program: ShaderProgramNeeds<K>,
  positionBuffer: Float32Array,
): program is ShaderProgramNeeds<Exclude<K, "vertexColor">> {
  const numComponents = 3;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  const vertexPosition = gl.getAttribLocation(program, "vertexColor");
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(
    vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(vertexPosition);
  return true;
}

export function setProjectionMatrix<K>(
  gl: WebGLRenderingContext,
  program: ShaderProgramNeeds<K>,
  matrix: mat4,
): program is ShaderProgramNeeds<Exclude<K, "projectionMatrix">> {
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "projectionMatrix"),
    false,
    matrix,
  );
  return true;
}

export function setRotationMatrix<K>(
  gl: WebGLRenderingContext,
  program: ShaderProgramNeeds<K>,
  matrix: mat4,
): program is ShaderProgramNeeds<Exclude<K, "rotationMatrix">> {
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "rotationMatrix"),
    false,
    matrix,
  );
  return true;
}
