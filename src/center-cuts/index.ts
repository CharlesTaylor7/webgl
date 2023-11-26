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
  drawElements,
  setVertexIndices,
} from "../typed-builder";

/*
TODO:
- [x] rotate camera with keyboard controls
- [x] animate camera
- [ ] hold keys to rotate camera instead of buffered actions
- [ ] outlines or gaps between pieces
- [ ] lighting
- [ ] less harsh background
- [ ] hot key to reset the camera to default orientation
- [ ] rotate slices with keyboard controls 
  - [x] fix colors
  - [x] draw half the puzzle
  - [x] draw arrays in two passes
  - [x] animate
  - [ ] internal model of puzzle
  - [ ] permute colors instead of positions
*/
type Polygon = {
  color: Color;
  points: Point[];
};
type Piece = {
  facets: Polygon[];
};
type Point = vec3;

const Colors = {
  PINK: rgb(237, 47, 234),
  SILVER: rgb(143, 143, 143),
  BLUE_VIOLET: [0.47, 0.6, 0.99, 1] as Color,
  SKY_BLUE: rgb(135, 206, 235),
  LIGHT_BLUE: rgb(212, 241, 252),
  LIGHT_GREEN: rgb(221, 250, 220),
  REDDISH_PINK: [0.96, 0.31, 0.51, 1] as Color,
  LIGHT_RED: [0.91, 0.68, 0.75, 1] as Color,
  LIGHT_PINK: rgb(252, 222, 255),
  LIGHT_PURPLE: [0.77, 0.68, 0.92, 1] as Color,
  CYAN: [0.05, 0.98, 0.94, 1] as Color,
  TEAL: [0.13, 0.82, 0.64, 1] as Color,
  VIOLET: [0.37, 0.31, 0.63, 1] as Color,
  YELLOW: [0.7, 0.79, 0.17, 1] as Color,
  BLUE: rgb(18, 54, 184),
  GREEN: rgb(14, 82, 17),
  RED: rgb(173, 25, 2),
  ORANGE: rgb(235, 135, 21),
  WHITE: rgb(244, 244, 245),
} as const;
Colors satisfies Record<string, Color>;

function polygonsToPositions(polygons: Array<Polygon>): Float32Array {
  const positions = [];
  for (let polygon of polygons) {
    for (let point of polygon.points) {
      positions.push(...point);
    }
  }
  return new Float32Array(positions);
}

// left hand for camera
const cameraDirections = {
  // wasdqe
  w: "c-x",
  a: "c+y",
  s: "c+x",
  d: "c-y",
  q: "c+z",
  e: "c-z",
} as const;
const cameraKeys = Object.keys(cameraDirections);
function isCameraKey(key: string): key is CameraKey {
  return cameraKeys.includes(key);
}

type Camera = typeof cameraDirections;
type CameraKey = keyof Camera;
type CameraMotion = Camera[CameraKey];

// right hand for rotations
const actions = {
  // ijkluo
  i: "r-x",
  j: "r+y",
  k: "r+x",
  l: "r-y",
  u: "r+z",
  o: "r-z",
} as const;
const actionKeys = Object.keys(actions);

function isActionKey(key: string): key is ActionKey {
  return actionKeys.includes(key);
}
type Actions = typeof actions;
type ActionKey = keyof Actions;
type Action = Actions[ActionKey];
"r-x" satisfies Action;

export function run(gl: WebGLRenderingContext): void {
  const pieces = initPieces();
  const polygons = pieces.flatMap((p) => p.facets);
  const indices = indexPattern(polygons);
  const p0 = default3DShaderProgram(gl);
  const p1 = setProjectionMatrix(gl, p0, getDefaultProjectionMatrix(gl));
  const p2 = setVertexPositions(gl, p1, polygonsToPositions(polygons));
  const p3 = setVertexColors(gl, p2, colorArray(polygons));
  const p4 = setVertexIndices(gl, p3, indices);

  let cameraRotation = mat4.create();
  mat4.translate(cameraRotation, cameraRotation, [0, 0, -6]);
  let activeCameraMotion: CameraMotion | null = null;

  const actionBuffer: Action[] = [];

  document.onkeydown = (e) => {
    if (isCameraKey(e.key)) {
      activeCameraMotion = cameraDirections[e.key];
    } else if (isActionKey(e.key)) {
      actionBuffer.push(actions[e.key]);
    }
  };

  document.onkeyup = (e) => {
    if (isCameraKey(e.key)) {
      activeCameraMotion = null;
    }
  };

  let then = 0;
  let frame = 0;
  let delta = 0;
  // it takes 1.6 seconds to rotate 120 degrees
  let duration = 1600;
  let rotation = (2 * Math.PI) / 3;

  function render(ms: number) {
    const action = actionBuffer[0];
    delta = ms - then;
    if (action) {
      frame += delta;
    }
    then = ms;

    if (activeCameraMotion) {
      rotate(cameraRotation, activeCameraMotion, (rotation * delta) / duration);
    }

    //(rotation * amount) / duration);
    if (frame > duration) {
      actionBuffer.shift();
      frame = 0;
    }

    resizeToScreen(gl);
    clearScene(gl);
    let p5 = setRotationMatrix(gl, p4, cameraRotation);
    drawElements(gl, p5, gl.TRIANGLES, 0, indices.length / 2);

    const rotationMatrix = mat4.create();
    if (action) {
      mat4.fromRotation(rotationMatrix, frame / duration, [1, 1, 1]);
    }
    mat4.multiply(rotationMatrix, cameraRotation, rotationMatrix);

    p5 = setRotationMatrix(gl, p4, rotationMatrix);
    drawElements(gl, p5, gl.TRIANGLES, indices.length / 2, indices.length / 2);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function rotate(camera: mat4, motion: CameraMotion, amount: number) {
  if (motion == "c+x") {
    mat4.rotateX(camera, camera, amount);
  }

  if (motion == "c-x") {
    mat4.rotateX(camera, camera, -amount);
  }

  if (motion == "c+y") {
    mat4.rotateY(camera, camera, amount);
  }

  if (motion == "c-y") {
    mat4.rotateY(camera, camera, -amount);
  }

  if (motion == "c+z") {
    mat4.rotateZ(camera, camera, amount);
  }

  if (motion == "c-z") {
    mat4.rotateZ(camera, camera, -amount);
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
  const data: number[] = [];

  for (let p of polygons) {
    const c = p.color || tap(randomColor());
    for (let k = 0; k < p.points.length; k++) {
      data.push(...c);
    }
  }

  return new Float32Array(data);
}

function initPieces(): Piece[] {
  let a = 1.5;
  let b = Math.sqrt(2) / 2;
  let c = (a + b) / 2;
  // let d = b / 2;

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
  const tr2 = rotateZ(tr1);
  const tr3 = rotateZ(tr2);
  const tr4 = rotateZ(tr3);

  const crossSection = (
    [
      [c, 0, c],
      [0, -c, c],
      [-c, -c, 0],
      [-c, 0, -c],
      [0, c, -c],
      [c, c, 0],
    ] as Point[]
  ).map(rotatePointY);
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

  return [
    // stationary
    // cross section
    [{ color: Colors.LIGHT_GREEN, points: crossSection }],
    // triangles
    [{ color: Colors.SILVER, points: t1 }],
    [{ color: Colors.RED, points: t2 }],
    [{ color: Colors.LIGHT_BLUE, points: t4 }],
    [{ color: Colors.BLUE, points: t5 }],

    // square capped pieces
    [
      { color: Colors.CYAN, points: s1 },
      { color: Colors.SILVER, points: tr1 },
      { color: Colors.RED, points: tr2 },
      { color: Colors.GREEN, points: tr3 },
      { color: Colors.LIGHT_BLUE, points: tr4 },
    ],
    [
      { color: Colors.TEAL, points: s3 },
      { color: Colors.BLUE, points: rotateY(tr1) },
      { color: Colors.SILVER, points: rotateY(tr2) },
      { color: Colors.LIGHT_BLUE, points: rotateY(tr3) },
      { color: Colors.ORANGE, points: rotateY(tr4) },
    ],
    [
      { color: Colors.LIGHT_PURPLE, points: s4 },
      { color: Colors.BLUE, points: rotateX(tr1, 3) },
      { color: Colors.YELLOW, points: rotateX(tr2, 3) },
      { color: Colors.RED, points: rotateX(tr3, 3) },
      { color: Colors.SILVER, points: rotateX(tr4, 3) },
    ],

    // rotated
    // cross section
    [{ color: Colors.LIGHT_GREEN, points: crossSection }],
    // triangles
    [{ color: Colors.GREEN, points: t3 }],
    [{ color: Colors.YELLOW, points: t6 }],
    [{ color: Colors.PINK, points: t7 }],
    [{ color: Colors.ORANGE, points: t8 }],
    [
      { color: Colors.VIOLET, points: s2 },
      { color: Colors.LIGHT_BLUE, points: rotateX(tr1) },
      { color: Colors.GREEN, points: rotateX(tr2) },
      { color: Colors.PINK, points: rotateX(tr3) },
      { color: Colors.ORANGE, points: rotateX(tr4) },
    ],
    [
      { color: Colors.SKY_BLUE, points: s5 },
      { color: Colors.RED, points: rotateY(tr1, 3) },
      { color: Colors.YELLOW, points: rotateY(tr2, 3) },
      { color: Colors.PINK, points: rotateY(tr3, 3) },
      { color: Colors.GREEN, points: rotateY(tr4, 3) },
    ],
    [
      { color: Colors.LIGHT_RED, points: s6 },
      { color: Colors.YELLOW, points: rotateY(tr1, 2) },
      { color: Colors.BLUE, points: rotateY(tr2, 2) },
      { color: Colors.ORANGE, points: rotateY(tr3, 2) },
      { color: Colors.PINK, points: rotateY(tr4, 2) },
    ],
  ].map((facets) => ({ facets: facets }));
}

function rotatePointX(p: Point): Point {
  return [p[0], -p[2], p[1]];
}

function rotatePointY(p: Point): Point {
  return [p[2], p[1], -p[0]];
}

function rotatePointZ(p: Point): Point {
  return [-p[1], p[0], p[2]];
}

/*
function rotatePointOctant1(p: Point): Point {
  return [p[2], p[0], p[1]];
}
*/

function rotateX(points: Point[], count: number = 1): Point[] {
  return points.map((p) => {
    for (let i = 0; i < count; i++) {
      p = rotatePointX(p);
    }
    return p;
  });
}

function rotateY(points: Point[], count: number = 1): Point[] {
  return points.map((p) => {
    for (let i = 0; i < count; i++) {
      p = rotatePointY(p);
    }
    return p;
  });
}

function rotateZ(points: Point[], count: number = 1): Point[] {
  return points.map((p) => {
    for (let i = 0; i < count; i++) {
      p = rotatePointZ(p);
    }
    return p;
  });
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
