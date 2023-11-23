import { mat4 } from "gl-matrix";
import { initShaderProgram } from "./utils";

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

declare const __brand: unique symbol;
type Branded<T, B> = T & { [__brand]: B };

export function webglContext(
  gl: WebGLRenderingContext,
): WebGLContext<
  | "vertexPosition"
  | "vertexColor"
  | "vertexIndices"
  | "rotationMatrix"
  | "projectionMatrix"
> {
  const program = initShaderProgram(gl, {
    vertex: default3DVertexShader,
    fragment: default3DFragmentShader,
  }) as any;

  return new WebGLContext(gl, program);
}
export function safeDrawElements(
  context: WebGLContext<never>,
  mode: GLenum,
  count: number,
) {
  return context._gl.drawElements(mode, count, context._gl.UNSIGNED_SHORT, 0);
}

export type WC<K> = WebGLContext<K>;

class WebGLContext<K> {
  constructor(
    readonly _gl: WebGLRenderingContext,
    private readonly p: Branded<WebGLProgram, K>,
  ) {}

  setVertexIndices(
    indices: Uint16Array,
    usage?: GLenum,
  ): WebGLContext<Exclude<K, "vertexIndices">> {
    const gl = this._gl;
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, usage || gl.STATIC_DRAW);

    return this as WebGLContext<Exclude<K, "vertexIndices">>;
  }

  setVertexPositions<K>(
    positions: Float32Array,
  ): WebGLContext<Exclude<K, "vertexPosition">> {
    const gl = this._gl;
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const attributeIndex = gl.getAttribLocation(this.p, "vertexPosition");
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

    return this as WebGLContext<Exclude<K, "vertexPosition">>;
  }

  setVertexColors<K>(
    colors: Float32Array,
  ): WebGLContext<Exclude<K, "vertexColor">> {
    const gl = this._gl;
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const attributeIndex = gl.getAttribLocation(this.p, "vertexColor");
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

    return this as WebGLContext<Exclude<K, "vertexColor">>;
  }

  setProjectionMatrix<K>(
    matrix: mat4,
  ): WebGLContext<Exclude<K, "projectionMatrix">> {
    const gl = this._gl;
    const program = this.p;
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "projectionMatrix"),
      false,
      matrix,
    );
    return this as WebGLContext<Exclude<K, "projectionMatrix">>;
  }

  setRotationMatrix<K>(
    matrix: mat4,
  ): WebGLContext<Exclude<K, "rotationMatrix">> {
    const gl = this._gl;
    const program = this.p;
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "rotationMatrix"),
      false,
      matrix,
    );
    return this as WebGLContext<Exclude<K, "rotationMatrix">>;
  }
}
