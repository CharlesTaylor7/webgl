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
  const colors: Color[] = [
    // octagons
    rgb(255, 255, 255),
    rgb(255, 255, 255),
    rgb(255, 255, 255),
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
  let c = (a + b) / 2;
  let d = b / 2;

  // triangles
  const t1: Point[] = [
    [c, 0, c],
    [0, c, c],
    [c, c, 0],
  ];
  const t2 = rotateZ(t1);
  const t3 = rotateZ(t2);
  const t4 = rotateZ(t3);
  const t5 = rotateY(t1);
  const t6 = rotateZ(t5);
  const t7 = rotateZ(t6);
  const t8 = rotateZ(t7);

  // trapezoids
  const tr1: Point[] = [
    [c, 0, c],
    [0, c, c],
    [0, b, a],
    [b, 0, a],
  ];
  const tr2 = rotateOctant1(tr1);
  const tr3 = rotateOctant1(tr2);

  const tr4 = rotateZ(tr1);
  const tr5 = rotateZ(tr2);
  const tr6 = rotateZ(tr3);

  const tr7 = rotateZ(tr4);
  const tr8 = rotateZ(tr5);
  const tr9 = rotateZ(tr6);

  const tr10 = rotateZ(tr7);
  const tr11 = rotateZ(tr8);
  const tr12 = rotateZ(tr9);

  const tr13 = rotateY(tr1);
  const tr14 = rotateY(tr2);
  const tr15 = rotateY(tr3);

  const tr16 = rotateZ(tr13);
  const tr17 = rotateZ(tr14);
  const tr18 = rotateZ(tr15);

  const tr19 = rotateZ(tr16);
  const tr20 = rotateZ(tr17);
  const tr21 = rotateZ(tr18);

  const tr22 = rotateZ(tr19);
  const tr23 = rotateZ(tr20);
  const tr24 = rotateZ(tr21);

  // squares
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

  // z octagon
  const o1: Point[] = [
    [a, -b, 0],
    [a, b, 0],
    [b, a, 0],
    [-b, a, 0],
    [-a, b, 0],
    [-a, -b, 0],
    [-b, -a, 0],
    [b, -a, 0],
  ];
  // y octagon
  const o2: Point[] = [
    [a, 0, -b],
    [a, 0, b],
    [b, 0, a],
    [-b, 0, a],
    [-a, 0, b],
    [-a, 0, -b],
    [-b, 0, -a],
    [b, 0, -a],
  ];
  // x octagon
  const o3: Point[] = [
    [0, a, -b],
    [0, a, b],
    [0, b, a],
    [0, -b, a],
    [0, -a, b],
    [0, -a, -b],
    [0, -b, -a],
    [0, b, -a],
  ];

  return [
    o1,
    o2,
    o3,
    t1,
    t2,
    t3,
    t4,
    t5,
    t6,
    t7,
    t8,
    tr1,
    tr2,
    tr3,
    tr4,
    tr5,
    tr6,
    tr7,
    tr8,
    tr9,
    tr10,
    tr11,
    tr12,
    tr13,
    tr14,
    tr15,
    tr16,
    tr17,
    tr18,
    tr19,
    tr20,
    tr21,
    tr22,
    tr23,
    tr24,
    s1,
    s2,
    s3,
    s4,
    s5,
    s6,
  ].map((points) => ({ points }));
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

function rotateOctant1(points: Point[]): Point[] {
  return points.map((p) => [p[2], p[0], p[1]]);
}
