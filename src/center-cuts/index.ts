import { mat4, vec3 } from "gl-matrix";
import {
  Color,
  rgb,
  clearScene,
  getDefaultProjectionMatrix,
  randomColor,
  resizeToScreen,
} from "../utils";

import {
  default3DShaderProgram,
  setProjectionMatrix,
  setVertexPositions,
  setVertexColors,
  setRotationMatrix,
  safeDrawElements,
  setVertexIndices,
} from "../typed-builder";

type Polygon = {
  color?: Color;
  points: Point[];
};
type Point = vec3;

const Colors = {
  PINK: rgb(237, 47, 234),
  SILVER: rgb(143, 143, 143),
  BLUE: rgb(18, 54, 184),
  GREEN: rgb(14, 82, 17),
  RED: rgb(173, 25, 2),
  ORANGE: rgb(235, 135, 21),
  WHITE: rgb(255, 255, 255),
  YELLOW: rgb(186, 194, 33),
};

function polygonsToPositions(polygons: Array<Polygon>): Float32Array {
  const positions = [];
  for (let polygon of polygons) {
    for (let point of polygon.points) {
      positions.push(...point);
    }
  }
  return new Float32Array(positions);
}

export function run(gl: WebGLRenderingContext): void {
  const polygons = initPolygons();
  const indices = indexPattern(polygons);
  const p0 = default3DShaderProgram(gl);
  const p1 = setProjectionMatrix(gl, p0, getDefaultProjectionMatrix(gl));
  const p2 = setVertexPositions(gl, p1, polygonsToPositions(polygons));
  const p3 = setVertexColors(gl, p2, colorArray(polygons));
  const p4 = setVertexIndices(gl, p3, indices);

  let cubeRotation = 0.0;
  let then = 0;
  function render(nowMillis: number) {
    resizeToScreen(gl);
    clearScene(gl);
    const p5 = setRotationMatrix(gl, p4, getRotationMatrix(cubeRotation));
    safeDrawElements(gl, p5, gl.TRIANGLES, indices.length);

    cubeRotation += nowMillis - then;
    then = nowMillis;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function indexPattern(polygons: Polygon[]): Uint16Array {
  const indices: number[] = [];
  let total = 0;
  for (let p of polygons) {
    const vertexCount = p.points.length;
    for (let i = 0; i < vertexCount - 2; i++) {
      indices.push(total, total + i + 1, total + i + 2);
    }
    total += vertexCount;
  }

  return new Uint16Array(indices);
}

function colorArray(polygons: Polygon[]): Float32Array {
  const colors: Color[] = [];
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

  for (let p of polygons) {
    const c = p.color || nextColor();
    for (let k = 0; k < p.points.length; k++) {
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
function initPolygons(): Polygon[] {
  let a = 1.5;
  let b = Math.sqrt(2) / 2;
  let c = b / 2;
  // triangles
  const t1: Point[] = [
    [c, c, a],
    [a, c, c],
    [c, a, c],
  ];
  const t2 = rotateZ(t1);
  const t3 = rotateZ(t2);
  const t4 = rotateZ(t3);
  const t5 = rotateY(t1);
  const t6 = rotateZ(t5);
  const t7 = rotateZ(t6);
  const t8 = rotateZ(t7);

  const s1: Point[] = [
    [b, 0, a],
    [0, b, a],
    [-b, 0, a],
    [0, -b, a],
  ];
  const s2 = rotateX(s1);
  const s3 = rotateZ(s2);
  const s4 = rotateZ(s3);
  const s5 = rotateZ(s4);
  const s6 = rotateX(s2);
  return [t1, t2, t3, t4, t5, t6, t7, t8, s1, s2, s3, s4, s5, s6].map(
    (points) => ({ points }),
  );
}

function rotateZ(points: Point[]): Point[] {
  return points.map((p) => [-p[1], p[0], p[2]]);
}

function rotateY(points: Point[]): Point[] {
  return points.map((p) => [p[2], p[1], -p[0]]);
}

function rotateX(points: Point[]): Point[] {
  return points.map((p) => [p[0], -p[2], p[1]]);
}
