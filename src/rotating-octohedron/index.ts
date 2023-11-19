import { mat4 } from "gl-matrix";

import { initShaderProgram } from "../utils";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export function run(gl: WebGLRenderingContext): void {
  const shaderProgram = initShaderProgram(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
  });
  gl.uniformMatrix4fv(
    gl.getUniformLocation(shaderProgram, "projectionMatrix"),
    false,
    getProjectionMatrix(gl.canvas as HTMLCanvasElement),
  );
  setPositionAttribute(gl, shaderProgram);
  setColorAttribute(gl, shaderProgram);
  initIndexBuffer(gl);

  let cubeRotation = 0.0;
  let deltaTime = 0;
  let then = 0;
  function render(nowMillis: number) {
    const now = nowMillis * 0.001;
    deltaTime = now - then;
    then = now;

    drawScene(gl, cubeRotation, shaderProgram);
    cubeRotation += deltaTime;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function clearScene(gl: WebGLRenderingContext) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function getProjectionMatrix(canvas: HTMLCanvasElement) {
  const fieldOfView = (45 * Math.PI) / 180;
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  return projectionMatrix;
}

function getModelViewMatrix(cubeRotation: number) {
  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [-0, 0, -6]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.7, [0, 1, 0]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.3, [1, 0, 0]);
  return modelViewMatrix;
}

function drawScene(
  gl: WebGLRenderingContext,
  cubeRotation: number,
  shaderProgram: WebGLProgram,
) {
  clearScene(gl);

  gl.uniformMatrix4fv(
    gl.getUniformLocation(shaderProgram, "modelMatrix"),
    false,
    getModelViewMatrix(cubeRotation),
  );

  const vertexCount = 36;
  const type = gl.UNSIGNED_SHORT;
  const offset = 0;
  gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
}

function setPositionAttribute(
  gl: WebGLRenderingContext,
  shaderProgram: WebGLProgram,
) {
  const numComponents = 3;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  const vertexPosition = gl.getAttribLocation(shaderProgram, "position");
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

  const vertexColor = gl.getAttribLocation(shaderProgram, "color");
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

  const v = [-1, 1];

  let positions: number[] = [];
  for (let x of v) {
    for (let y of v) {
      for (let z of v) {
        positions.push(
          x, 0, 0,
          0, y, 0,
          0, 0, z,
        )
      }
    }
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}

export function initColorBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  const faceColors = [
    [1.0, 1.0, 1.0, 1.0], //  white
    [1.0, 0.0, 0.0, 1.0], //  red
    [0.0, 1.0, 0.0, 1.0], //  green
    [0.0, 0.0, 1.0, 1.0], //  blue
    [1.0, 1.0, 0.0, 1.0], //  yellow
    [1.0, 0.0, 1.0, 1.0], //  purple
    [0.0, 1.0, 1.0, 1.0], //  cyan
    [0.5, 0.5, 0.5, 1.0], //  grey
  ];

  // Convert the array of colors into a table for all the vertices.

  var colors: number[] = [];

  for (var j = 0; j < faceColors.length; ++j) {
    const c = faceColors[j];
    // Repeat each color 3 times for the vertices of each face
    colors = colors.concat(c, c, c);
  }

  const colorBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return colorBuffer;
}

// prettier-ignore
function initIndexBuffer(gl: WebGLRenderingContext) {
  const indexBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  const indices = [
    0, 1, 2,
    3, 4, 5,
    6, 7, 8,
    9, 10, 11,
    12, 13, 14,
    15, 16, 17,
    18, 19, 20,
    21, 22, 23,
  ];


  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );
}