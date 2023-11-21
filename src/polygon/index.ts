import {
  clearScene,
  initShaderProgram,
  randomColor,
  resizeCanvasToDisplaySize,
} from "../utils";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export function run(gl: WebGLRenderingContext): void {
  resizeCanvasToDisplaySize(gl);
  new PolygonRenderer(gl, 12).run();
}

class PolygonRenderer {
  private readonly program: WebGLProgram;
  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly vertexCount: number,
  ) {
    this.program = initShaderProgram(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
    });
  }

  run() {
    this.provideVertexPositions();
    this.provideVertexColors();
    this.provideVertexIndices();
    this.drawScene();
  }

  drawScene() {
    clearScene(this.gl);

    // 3 vertices per triangle
    const vertexCount = 3 * (this.vertexCount - 2);
    const type = this.gl.UNSIGNED_SHORT;
    const offset = 0;
    this.gl.drawElements(this.gl.TRIANGLES, vertexCount, type, offset);
  }

  provideVertexPositions() {
    const gl = this.gl;
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;

    const vertexPosition = gl.getAttribLocation(this.program, "vertexPosition");
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positionsOfUnity(this.vertexCount)),
      gl.STATIC_DRAW,
    );
    gl.vertexAttribPointer(
      vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(vertexPosition);
  }

  provideVertexColors() {
    const gl = this.gl;
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    const vertexColor = gl.getAttribLocation(this.program, "vertexColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.initColorBuffer());
    gl.vertexAttribPointer(
      vertexColor,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(vertexColor);
  }

  initColorBuffer(): WebGLBuffer {
    const gl = this.gl;
    const colors: number[] = Array.from({ length: this.vertexCount }, () =>
      randomColor(),
    ).flatMap((c) => c);

    const colorBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    return colorBuffer;
  }

  provideVertexIndices() {
    const indices: number[] = [];
    for (let i = 0; i < this.vertexCount - 2; i++) {
      indices.push(0, i + 1, i + 2);
    }

    const gl = this.gl;
    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW,
    );
  }
}
