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

/*
TODO:
- [x] rotate camera with keyboard controls
- [x] animate rotations
- [ ] hot key to reset the camera to default orientation
- [ ] rotate slices with keyboard controls 
  - fix colors
*/

type Polygon = {
  color?: Color;
  points: Point[];
};
type Point = vec3;

const Colors: Record<string, Color> = {
  PINK: rgb(237, 47, 234),
  SILVER: rgb(143, 143, 143),
  SKY_BLUE: [0.47274511543352515, 0.600756638089563, 0.9863821399867976, 1],
  REDDISH_PINK: [0.96, 0.31, 0.51, 1],
  LIGHT_PINK: [0.91, 0.68, 0.75, 1],
  LIGHT_PURPLE: [0.77, 0.68, 0.92, 1],
  CYAN: [0.05, 0.98, 0.94, 1],
  TEAL: [0.13, 0.82, 0.64, 1],
  VIOLET: [0.37, 0.31, 0.63, 1],
  YELLOW: [0.7, 0.79, 0.17, 1],
  BLUE: rgb(18, 54, 184),
  GREEN: rgb(14, 82, 17),
  RED: rgb(173, 25, 2),
  ORANGE: rgb(235, 135, 21),
  WHITE: rgb(255, 255, 255),
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

const actions = {
  // left hand for camera
  // wasdqe
  w: "c-x",
  a: "c+y",
  s: "c+x",
  d: "c-y",
  q: "c+z",
  e: "c-z",

  // right hand for rotations
  // ijkluo
  i: "r-x",
  j: "r+y",
  k: "r+x",
  l: "r-y",
  u: "r+z",
  o: "r-z",
} as const;
const keys = Object.keys(actions);

function isHotKey(key: string): key is HotKey {
  return keys.includes(key);
}
type Actions = typeof actions;
type HotKey = keyof Actions;
type Action = Actions[HotKey];
"r-x" satisfies Action;

export function run(gl: WebGLRenderingContext): void {
  const polygons = initPolygons();
  const indices = indexPattern(polygons);
  const p0 = default3DShaderProgram(gl);
  const p1 = setProjectionMatrix(gl, p0, getDefaultProjectionMatrix(gl));
  const p2 = setVertexPositions(gl, p1, polygonsToPositions(polygons));
  const p3 = setVertexColors(gl, p2, colorArray(polygons));
  const p4 = setVertexIndices(gl, p3, indices);

  let rotationMatrix = mat4.create();
  mat4.translate(rotationMatrix, rotationMatrix, [0, 0, -6]);

  const actionBuffer: Action[] = [];
  document.onkeydown = (e) => {
    if (isHotKey(e.key)) {
      actionBuffer.push(actions[e.key]);
    }
  };

  let then = 0;
  let frame = 0;
  let duration = 400;
  let rotation = Math.PI / 8;

  function render(ms: number) {
    const action = actionBuffer[0];
    const delta = ms - then;
    then = ms;
    if (action) {
      frame += delta;
    }
    const amount = frame > duration ? duration - (frame - delta) : delta;

    if (action) {
      console.log({ action, ms, delta, frame, duration, amount });
    }
    rotate(rotationMatrix, action, (rotation * delta) / duration);
    //(rotation * amount) / duration);
    if (frame > duration) {
      actionBuffer.shift();
      frame = 0;
    }

    const p5 = setRotationMatrix(gl, p4, rotationMatrix);
    resizeToScreen(gl);
    clearScene(gl);
    //safeDrawElements(gl, p5, gl.TRIANGLES, indices.length);
    safeDrawElements(gl, p5, gl.TRIANGLES, indices.length / 2);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function rotate(matrix: mat4, action: Action, amount: number) {
  if (action == "c+x") {
    mat4.rotateX(matrix, matrix, amount);
  }

  if (action == "c-x") {
    mat4.rotateX(matrix, matrix, -amount);
  }

  if (action == "c+y") {
    mat4.rotateY(matrix, matrix, amount);
  }

  if (action == "c-y") {
    mat4.rotateY(matrix, matrix, -amount);
  }

  if (action == "c+z") {
    mat4.rotateZ(matrix, matrix, amount);
  }

  if (action == "c-z") {
    mat4.rotateZ(matrix, matrix, -amount);
  }
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

function tap(x: any): any {
  console.log(JSON.stringify(x));
  return x;
}
function colorArray(polygons: Polygon[]): Float32Array {
  const colors: Color[] = [
    // octagons
    rgb(255, 255, 255),
    rgb(255, 255, 255),
    rgb(255, 255, 255),
    Colors.SILVER,
    Colors.PINK,
  ];
  const data: number[] = [];
  const nextColor = (() => {
    let i = 0;
    return () => {
      i++;
      return colors[i] || tap(randomColor());
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

// BLOG: const assertions and DRY unions
// how to have a typed union based on an array literal:
/*

type ValuesOf<T> = T extends ReadonlyArray<infer E> ? E : never;

const actions = ["j", "k", "h", "l", "u", "i"] as const;
type Action = ValuesOf<typeof actions>;
function isAction(key: string): key is Action {
  return actions.contains(key);
}

*/
