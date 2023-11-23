import { mat4 } from "gl-matrix";

import {
  clearScene,
  getProjectionMatrix,
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
    getProjectionMatrix(gl),
  );
  setPositionAttribute(gl, shaderProgram);
  setVertexColors(gl, shaderProgram);
  const indexBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    indexPattern([8, 8, 8, 4, 4, 4, 4, 4, 4]),
    gl.STATIC_DRAW,
  );

  let cubeRotation = 0.0;
  let then = 0;
  function render(nowMillis: number) {
    resizeToScreen(gl);
    clearScene(gl);

    gl.uniformMatrix4fv(
      gl.getUniformLocation(shaderProgram, "modelMatrix"),
      false,
      getModelViewMatrix(cubeRotation),
    );

    drawScene(gl);

    cubeRotation += nowMillis - then;
    then = nowMillis;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function drawScene(gl: WebGLRenderingContext) {
  // octagon outlines
  //
  gl.drawArrays(gl.LINE_LOOP, 0, 8);
  gl.drawArrays(gl.LINE_LOOP, 8, 8);
  gl.drawArrays(gl.LINE_LOOP, 16, 8);
  // square faces
  gl.drawArrays(gl.LINE_LOOP, 24, 4);
  gl.drawArrays(gl.LINE_LOOP, 28, 4);
  gl.drawArrays(gl.LINE_LOOP, 32, 4);
  gl.drawArrays(gl.LINE_LOOP, 36, 4);
  gl.drawArrays(gl.LINE_LOOP, 40, 4);
  gl.drawArrays(gl.LINE_LOOP, 44, 4);

  gl.drawElements(gl.TRIANGLES, 90, gl.UNSIGNED_SHORT, 0);
}

// prettier-ignore
function initPositionBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  const positionBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  let root_2 = Math.sqrt(2)
  let positions = [
    // z octagon
    1.5, -root_2/2, 0,
    1.5, root_2/2, 0,
    root_2/2, 1.5, 0,
    -root_2/2, 1.5, 0,
    -1.5, root_2/2, 0,
    -1.5, -root_2/2, 0,
    -root_2/2, -1.5, 0,
    root_2/2, -1.5, 0,
    // y octagon
    1.5, 0, -root_2/2,
    1.5, 0, root_2/2,
    root_2/2, 0, 1.5,
    -root_2/2, 0, 1.5,
    -1.5, 0, root_2/2, 
    -1.5, 0, -root_2/2,
    -root_2/2, 0, -1.5,
    root_2/2, 0, -1.5,
    // x octagon
     0,1.5, -root_2/2,
     0,1.5, root_2/2,
     0,root_2/2, 1.5,
     0,-root_2/2, 1.5,
     0,-1.5, root_2/2, 
     0, -1.5,-root_2/2,
     0, -root_2/2,-1.5,
     0, root_2/2,-1.5,
     // top square
     root_2/2,0, 1.5,
     0, root_2/2, 1.5,
     -root_2/2,0, 1.5,
     0, -root_2/2, 1.5,
     // bottom square
     root_2/2,0, -1.5,
     0, root_2/2, -1.5,
     -root_2/2,0, -1.5,
     0, -root_2/2, -1.5,

     // front square
     root_2/2,-1.5, 0, 
     0,  -1.5, root_2/2,
     -root_2/2, -1.5, 0,
     0,  -1.5, -root_2/2,

     // back square
     root_2/2,1.5, 0, 
     0,  1.5, root_2/2,
     -root_2/2, 1.5, 0,
     0,  1.5, -root_2/2,
      // right  square
     1.5, root_2/2, 0, 
     1.5, 0,  root_2/2,
     1.5, -root_2/2, 0,
     1.5, 0, -root_2/2,

      // left  square
     -1.5, root_2/2, 0, 
     -1.5, 0,  root_2/2,
     -1.5, -root_2/2, 0,
     -1.5, 0, -root_2/2,
  ]
  console.log("num positions", positions.length)

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
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

function indexPattern(counts: number[]): Uint16Array {
  const indices: number[] = [];
  let total = 0;
  for (let count of counts) {
    for (let i = 0; i < count - 2; i++) {
      indices.push(total, total + i + 1, total + i + 2);
    }
    total += count;
  }

  return new Uint16Array(indices);
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
