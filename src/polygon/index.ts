import { initShaderProgram } from "../utils";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export function run(gl: WebGLRenderingContext): void {
  const shaderProgram = initShaderProgram(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
  });
  setPositionAttribute(gl, shaderProgram);
  setColorAttribute(gl, shaderProgram);
  initIndexBuffer(gl);

  drawScene(gl);
}

function clearScene(gl: WebGLRenderingContext) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function drawScene(gl: WebGLRenderingContext) {
  clearScene(gl);

  const vertexCount = 3;
  const type = gl.UNSIGNED_SHORT;
  const offset = 0;
  gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
}

function setPositionAttribute(
  gl: WebGLRenderingContext,
  shaderProgram: WebGLProgram,
) {
  const numComponents = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  const vertexPosition = gl.getAttribLocation(shaderProgram, "vertexPosition");
  gl.bindBuffer(gl.ARRAY_BUFFER, initPositionBuffer(gl));
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

function setColorAttribute(
  gl: WebGLRenderingContext,
  shaderProgram: WebGLProgram,
) {
  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  const vertexColor = gl.getAttribLocation(shaderProgram, "vertexColor");
  gl.bindBuffer(gl.ARRAY_BUFFER, initColorBuffer(gl));
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

// prettier-ignore
function initPositionBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  const positionBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const positions = [
    // Front face
    0.0, 1.0, //
    1.0, 0.0, 
    0, 0,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  return positionBuffer;
}

// prettier-ignore
function initColorBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  var colors: number[] = [
    1.0, 1.0, 1.0, 1.0, //  white
    1.0, 0.0, 0.0, 1.0, //  red
    0.0, 1.0, 0.0, 1.0, //  green
    0.0, 0.0, 1.0, 1.0, //  blue
  ]

  const colorBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 
                new Float32Array(colors), 
                gl.STATIC_DRAW
      );

  return colorBuffer;
}

function initIndexBuffer(gl: WebGLRenderingContext) {
  const indexBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([0, 1, 2]),
    gl.STATIC_DRAW,
  );
}
