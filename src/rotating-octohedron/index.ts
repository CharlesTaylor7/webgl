import { mat4 } from "gl-matrix";

import {
  clearScene,
  getDefaultProjectionMatrix,
  initShaderProgram,
  resizeToScreen,
} from "../utils";

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
    getDefaultProjectionMatrix(gl),
  );
  setPositionAttribute(gl, shaderProgram);
  setColorAttribute(gl, shaderProgram);

  let cubeRotation = 0.0;
  let deltaTime = 0;
  let then = 0;
  function render(nowMillis: number) {
    const now = nowMillis * 0.001;
    deltaTime = now - then;
    then = now;

    resizeToScreen(gl);
    drawScene(gl, cubeRotation, shaderProgram);
    cubeRotation += deltaTime;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
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

  gl.drawArrays(gl.TRIANGLES, 0, 24);
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
          x, 0, 0, // x axis
          0, y, 0, // y axis
          0, 0, z, // z axis
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
