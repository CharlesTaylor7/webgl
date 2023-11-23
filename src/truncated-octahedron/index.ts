import { mat4 } from "gl-matrix";
import {
  Color,
  rgb,
  clearScene,
  getDefaultProjectionMatrix,
  randomColor,
  resizeToScreen,
} from "../utils";

import { webglContext, safeDrawElements, WC } from "../typed-builder";

export function run(gl: WebGLRenderingContext): void {
  const indices = indexPattern([8, 6], [6, 4]);
  const context = webglContext(gl).setProjectionMatrix(
    getDefaultProjectionMatrix(gl),
  );
  context satisfies WC<"">;
  /*
  context
    .setVertexPositions(positionArray())
    .setVertexColors(colorArray())
    .setVertexIndices(indices);
    */

  let cubeRotation = 0.0;
  let then = 0;
  function render(nowMillis: number) {
    resizeToScreen(gl);
    clearScene(gl);
    const complete = context.setRotationMatrix(getRotationMatrix(cubeRotation));

    safeDrawElements(complete, gl.TRIANGLES, indices.length);

    cubeRotation += nowMillis - then;
    then = nowMillis;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// prettier-ignore
function positionArray(): Float32Array {
  let a = 1.5;
  let b = Math.sqrt(2) / 2;
  return new Float32Array([
    // pink
     0, b, a,
     b, 0, a,
     a, 0, b,
     a, b, 0, 
     b, a, 0, 
     0, a, b,

     // silver
     0, -b, -a,
     -b, 0, -a,
     -a, 0, -b,
     -a, -b, 0, 
     -b, -a, 0, 
     0, -a, -b,

     // blue
     0, b, a,
     -b, 0, a,
     -a, 0, b,
     -a, b, 0, 
     -b, a, 0, 
     0, a, b,

     // green
     0, -b, -a,
     b, 0, -a,
     a, 0, -b,
     a, -b, 0, 
     b, -a, 0, 
     0, -a, -b,
 
     // red
     0, -b, a,
     -b, 0, a,
     -a, 0, b,
     -a, -b, 0, 
     -b, -a, 0, 
     0, -a, b,

     // orange
     0, b, -a,
     b, 0, -a,
     a, 0, -b,
     a, b, 0, 
     b, a, 0, 
     0, a, -b,

     // white
     0, -b, a,
     b, 0, a,
     a, 0, b,
     a, -b, 0, 
     b, -a, 0, 
     0, -a, b,

     // yellow
     0, b, -a,
     -b, 0, -a,
     -a, 0, -b,
     -a, b, 0, 
     -b, a, 0, 
     0, a, -b,

     // top square
     b,0, a,
     0, b, a,
     -b,0, a,
     0, -b, a,

     // bottom square
     b,0, -a,
     0, b, -a,
     -b,0, -a,
     0, -b, -a,

     // front square
     b,-a, 0, 
     0,  -a, b,
     -b, -a, 0,
     0,  -a, -b,

     // back square
     b,a, 0, 
     0,  a, b,
     -b, a, 0,
     0,  a, -b,

      // right  square
     a, b, 0, 
     a, 0,  b,
     a, -b, 0,
     a, 0, -b,

      // left  square
     -a, b, 0, 
     -a, 0,  b,
     -a, -b, 0,
     -a, 0, -b,
  ])
}

function indexPattern(...counts: [number, number][]): Uint16Array {
  const indices: number[] = [];
  let total = 0;
  for (let [repeat, vertexCount] of counts) {
    for (let k = 0; k < repeat; k++) {
      for (let i = 0; i < vertexCount - 2; i++) {
        indices.push(total, total + i + 1, total + i + 2);
      }
      total += vertexCount;
    }
  }

  return new Uint16Array(indices);
}

function colorArray(): Float32Array {
  const colors: Color[] = [
    rgb(237, 47, 234), // pink
    rgb(143, 143, 143), // silver
    rgb(18, 54, 184), // blue
    rgb(14, 82, 17), // green
    rgb(173, 25, 2), // red
    rgb(235, 135, 21), // orange
    rgb(255, 255, 255), // white
    rgb(186, 194, 33), // yellow
  ];
  const data: number[] = [];
  const nextColor = (() => {
    let i = 0;
    return () => {
      i++;
      let color = colors[i];
      if (color !== undefined) {
        return color;
      }
      color = randomColor();
      console.log(JSON.stringify(color));
      return color;
    };
  })();

  // hexes
  for (let j = 0; j < 8; ++j) {
    const c = nextColor();
    for (let k = 0; k < 6; k++) {
      data.push(...c);
    }
  }

  // squares
  for (let j = 0; j < 6; ++j) {
    const c = nextColor();
    for (let k = 0; k < 4; k++) {
      data.push(...c);
    }
  }
  return new Float32Array(data);
}

function getRotationMatrix(cubeRotation: number): mat4 {
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

// octagons
/*
    // z octagon
    a, -b, 0,
    a, b, 0,
    b, a, 0,
    -b, a, 0,
    -a, b, 0,
    -a, -b, 0,
    -b, -a, 0,
    b, -a, 0,
    // y octagon
    a, 0, -b,
    a, 0, b,
    b, 0, a,
    -b, 0, a,
    -a, 0, b, 
    -a, 0, -b,
    -b, 0, -a,
    b, 0, -a,
    // x octagon
     0,a, -b,
     0,a, b,
     0,b, a,
     0,-b, a,
     0,-a, b, 
     0, -a,-b,
     0, -b,-a,
     0, b,-a,
     */
