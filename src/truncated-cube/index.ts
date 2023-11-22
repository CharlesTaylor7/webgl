import { mat4 } from "gl-matrix";

import {
  Color,
  clearScene,
  getProjectionMatrix,
  initShaderProgram,
  randomColor,
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
    getProjectionMatrix(gl),
  );
  setPositionAttribute(gl, shaderProgram);
  setVertexColors(gl, shaderProgram);

  let cubeRotation = 0.0;
  let then = 0;
  function render(nowMillis: number) {
    resizeToScreen(gl);
    drawScene(gl, cubeRotation, shaderProgram);
    cubeRotation += nowMillis - then;
    then = nowMillis;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function getModelViewMatrix(cubeRotation: number) {
  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [-0, 0, -6]);
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    cubeRotation * 0.001,
    [0, 0, 1],
  );
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    cubeRotation * 0.0007,
    [0, 1, 0],
  );
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    cubeRotation * 0.0003,
    [1, 0, 0],
  );

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

  gl.drawArrays(gl.TRIANGLES, 0, 60);
}

function setPositionAttribute(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
) {
  const numComponents = 3;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  const vertexPosition = gl.getAttribLocation(program, "vertexPosition");
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

// prettier-ignore
function initPositionBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  const positionBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);


  let positions = [
    // triangles first
    // anticlockwise around the top
    // anticlockwise faces
    // Tri Face 1
    1, 0, 1,
    1, 1, 0,
    0, 1, 1,
  
    // Tri face 2
    0, 1, 1,
    -1, 1, 0,
    -1, 0, 1,
    // Tri Face 3
    -1, 0, 1,
    -1, -1, 0,
    0, -1, 1,
    // Tri Face 4
    0, -1, 1,
    1, -1, 0,
    1, 0, 1,

    // Tri Face 5
    1, 0, -1,
    1, 1, 0,
    0, 1, -1,
    // Tri face 6
    0, 1, -1,
    -1, 1, 0,
    -1, 0, -1,
    // Tri Face 7
    -1, 0, -1,
    -1, -1, 0,
    0, -1, -1,
    // Tri Face 8
    0, -1, -1,
    1, -1, 0,
    1, 0, -1,

    // Square Face top
    1, 0, 1,
    0, 1, 1,
    -1, 0, 1,

    -1, 0, 1,
    0, -1, 1,
    1, 0, 1,

    // Square Face Bottom
    1, 0, -1,
    0, 1, -1,
    -1, 0, -1,

    -1, 0, -1,
    0, -1, -1,
    1, 0, -1,

    // Square Face Front
    1, -1, 0,
    0, -1, 1,
    -1, -1, 0,

    -1, -1, 0,
    0, -1, -1,
    1, -1, 0,
    // Square Face Back
    1, 1, 0,
    0, 1, 1,
    -1, 1, 0,

    -1, 1, 0,
    0, 1, -1,
    1, 1, 0,



    // Square Face Right
    1, 1, 0,
    1, 0, 1,
    1, -1, 0,

    1, -1, 0,
    1, 0, -1,
    1, 1, 0,

    // Square Face Left
    -1, 1, 0,
    -1, 0, 1,
    -1, -1, 0,

    -1, -1, 0,
    -1, 0, -1,
    -1, 1, 0,
  ]
  console.log(positions.length)

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}

function setVertexColors(gl: WebGLRenderingContext, program: WebGLProgram) {
  // eight triangular faces
  const triangularFaces = [
    [1.0, 1.0, 1.0, 1], //  white
    [1.0, 0.0, 0.0, 1], //  red
    [0.0, 1.0, 0.0, 1], //  green
    [0.0, 0.0, 1.0, 1], //  blue
    [1.0, 1.0, 0.0, 1], //  yellow
    [1.0, 0.0, 1.0, 1], //  magenta
    [0.0, 1.0, 1.0, 1], //  cyan
    [0.5, 0.5, 0.5, 1], //  grey
  ];

  const squareFaces = [
    [1.0, 0.5, 0.0, 1], //  orange
    [0.5, 0.2, 0.1, 1], // brown
    [0.5, 0.2, 0.8, 1], // purple
    [0.14759373986641555, 0.12219881675388389, 0.5906033132651336, 1],
    [0.38226078899287597, 0.5851489767196165, 0.08183275204830642, 1],
    [0.4584854602468402, 0.88051891197324, 0.7589112922990673, 1],
  ];

  // Convert the array of colors into a table for all the vertices.
  var colors: number[] = [];

  // Repeat each color 3 times for the vertices of each face
  for (let j = 0; j < 8; ++j) {
    const c = triangularFaces[j];
    colors.push(...c, ...c, ...c);
  }

  console.log("square colors", JSON.stringify(squareFaces));
  // Repeat each color 6 times for the vertices of each face
  for (let j = 0; j < 6; ++j) {
    const c = squareFaces[j];
    colors.push(...c, ...c, ...c, ...c, ...c, ...c);
  }

  const colorBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  const vertexColor = gl.getAttribLocation(program, "vertexColor");
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
