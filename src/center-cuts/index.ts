import { mat4, vec3 } from "gl-matrix";
import {
  Color,
  rgb,
  clearScene,
  getDefaultProjectionMatrix,
  resizeToScreen,
} from "../utils";

import {
  default3DShaderProgram,
  setVertexPositions,
  setVertexColors,
  setTransformMatrix,
  drawElements,
  setVertexIndices,
} from "../typed-builder";

/*
TODO:
- [x] rotate camera with keyboard controls
- [x] animate camera
- [x] hold keys to rotate camera instead of buffered actions
- [ ] outlines or gaps between pieces
- [ ] lighting
- [ ] less harsh background
- [ ] hot key to reset the camera to default orientation
- [ ] rotate slices with keyboard controls 
  - [x] fix colors
  - [x] draw half the puzzle
  - [x] draw arrays in two passes
  - [x] animate
  - [x] permute colors instead of positions
  - [ ] rotate camera and puzzle at independent speeds
  -
*/
type Polygon = {
  tag: ColorName;
  points: Point[];
};

type Permutation = Record<number, number>;

type PieceTag =
  // triangle center
  | `t${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  // square cap
  | `s${1 | 2 | 3 | 4 | 5 | 6}`
  // hexagonal cross section
  | `h${1 | 2}`;

type Piece = {
  tag: PieceTag;
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
  RED: rgb(173, 25, 2),
  LIGHT_RED: [0.91, 0.68, 0.75, 1] as Color,
  LIGHT_PINK: rgb(252, 222, 255),
  LIGHT_PURPLE: [0.77, 0.68, 0.92, 1] as Color,
  CYAN: [0.05, 0.98, 0.94, 1] as Color,
  TEAL: [0.13, 0.82, 0.64, 1] as Color,
  VIOLET: [0.37, 0.31, 0.63, 1] as Color,
  YELLOW: [0.7, 0.79, 0.17, 1] as Color,
  BLUE: rgb(18, 54, 184),
  GREEN: rgb(14, 82, 17),
  ORANGE: rgb(235, 135, 21),
} as const;
Colors satisfies Record<string, Color>;
type ColorName = keyof typeof Colors;

const initialFacetColors: Color[] = [
  // cross section
  Colors.LIGHT_GREEN,
  // triangles
  Colors.SILVER,
  Colors.REDDISH_PINK,
  Colors.LIGHT_BLUE,
  Colors.BLUE,

  // square
  Colors.CYAN,
  Colors.SILVER,
  Colors.REDDISH_PINK,
  Colors.GREEN,
  Colors.LIGHT_BLUE,
  // square
  Colors.TEAL,
  Colors.BLUE,
  Colors.SILVER,
  Colors.LIGHT_BLUE,
  Colors.ORANGE,

  // square
  Colors.LIGHT_PURPLE,
  Colors.BLUE,
  Colors.YELLOW,
  Colors.REDDISH_PINK,
  Colors.SILVER,

  // cross section
  Colors.LIGHT_GREEN,
  // triangles
  Colors.GREEN,
  Colors.YELLOW,
  Colors.PINK,
  Colors.ORANGE,

  // square
  Colors.VIOLET,
  Colors.LIGHT_BLUE,
  Colors.GREEN,
  Colors.PINK,
  Colors.ORANGE,

  // square
  Colors.SKY_BLUE,
  Colors.REDDISH_PINK,
  Colors.YELLOW,
  Colors.PINK,
  Colors.GREEN,

  // square
  Colors.LIGHT_RED,
  Colors.YELLOW,
  Colors.BLUE,
  Colors.ORANGE,
  Colors.PINK,
];

function polygonsToPositions(polygons: Array<Polygon>): Float32Array {
  const positions = [];
  for (let polygon of polygons) {
    for (let point of polygon.points) {
      positions.push(...point);
    }
  }
  return new Float32Array(positions);
}

function identityPermutation(): Permutation {
  return {} as Permutation;
}

// left hand for camera
const cameraMotions = {
  // wasdqe
  w: "c-x",
  a: "c-y",
  s: "c+x",
  d: "c+y",
  q: "c+z",
  e: "c-z",
} as const;

const cameraKeys = Object.keys(cameraMotions);
function isCameraKey(key: string): key is CameraKey {
  return cameraKeys.includes(key);
}

type Camera = typeof cameraMotions;
type CameraKey = keyof Camera;
//type CameraMotion = Camera[CameraKey];

// 4 axes of rotation
const actions = {
  h: "r1",
  j: "r2",
  k: "r3",
  l: "r4",
} as const;
const actionKeys = Object.keys(actions);

function isActionKey(key: string): key is ActionKey {
  return actionKeys.includes(key);
}
type Actions = typeof actions;
type ActionKey = keyof Actions;
type Action = Actions[ActionKey];

export function run(gl: WebGLRenderingContext): void {
  // setup
  const pieces = initPieces();
  const polygons = pieces.flatMap((p) => p.facets);
  const indices = indexPattern(polygons);
  const p0 = default3DShaderProgram(gl);
  const p1 = setVertexPositions(gl, p0, polygonsToPositions(polygons));
  const p2 = setVertexIndices(gl, p1, indices);
  const p3 = setVertexColors(gl, p2, colorArray(polygons));

  // it takes 1.6 seconds to rotate 120 degrees
  const cameraSpeed = (2 * Math.PI) / (3 * 1600);

  const duration = 400;
  const rotation = (2 * Math.PI) / 3;

  // state
  let activeCameraAxis = vec3.create();
  const cameraRotation = mat4.create();
  const puzzleRotation = mat4.create();
  const actionBuffer: Action[] = [];

  let permutation: Permutation = identityPermutation();

  let then = 0;
  let frame = 0;
  let delta = 0;
  let transform = mat4.create();

  document.onkeydown = (e) => {
    if (isCameraKey(e.key)) {
      const motion = cameraMotions[e.key];
      if (motion === "c+x") {
        activeCameraAxis[0] = 1;
      }
      if (motion === "c-x") {
        activeCameraAxis[0] = -1;
      }
      if (motion === "c+y") {
        activeCameraAxis[1] = 1;
      }
      if (motion === "c-y") {
        activeCameraAxis[1] = -1;
      }
      if (motion === "c+z") {
        activeCameraAxis[2] = 1;
      }
      if (motion === "c-z") {
        activeCameraAxis[2] = -1;
      }
    } else if (isActionKey(e.key)) {
      actionBuffer.push(actions[e.key]);
    }
  };

  document.onkeyup = (e) => {
    if (isCameraKey(e.key)) {
      const motion = cameraMotions[e.key];
      if (motion.endsWith("x")) {
        activeCameraAxis[0] = 0;
      }
      if (motion.endsWith("y")) {
        activeCameraAxis[1] = 0;
      }
      if (motion.endsWith("z")) {
        activeCameraAxis[2] = 0;
      }
    }
  };
  function render(ms: number) {
    let action: Action | undefined = actionBuffer[0];
    delta = ms - then;
    if (action) {
      frame += delta;
      if (frame > duration) {
        actionBuffer.shift();
        frame = 0;
        // TODO: apply rotation now
        permCycle(permutation, 2, 4, 3);
        permCycle(permutation, 5, 15, 10);
        permCycle(permutation, 7, 13);
        setVertexColors(gl, p1, colorArray(polygons, permutation));
        action = undefined;
      }
    }
    then = ms;

    if (activeCameraAxis.some((c) => c !== 0)) {
      mat4.fromRotation(transform, delta * cameraSpeed, activeCameraAxis);
      mat4.multiply(cameraRotation, transform, cameraRotation);
    }

    resizeToScreen(gl);
    clearScene(gl);
    getDefaultProjectionMatrix(gl, transform);
    mat4.multiply(transform, transform, cameraRotation);
    let p4 = setTransformMatrix(gl, p3, transform);
    drawElements(gl, p4, gl.TRIANGLES, indices.length / 2, indices.length / 2);

    if (action) {
      mat4.fromRotation(
        puzzleRotation,
        (rotation * frame) / duration,
        [1, 1, 1],
      );
      mat4.multiply(transform, transform, puzzleRotation);
    }

    p4 = setTransformMatrix(gl, p3, transform);
    drawElements(gl, p4, gl.TRIANGLES, 0, indices.length / 2);

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

/*
function tap(x: any): any {
  console.log(JSON.stringify(x));
  return x;
}
*/
function colorArray(
  polygons: Polygon[],
  permutation?: Permutation,
): Float32Array {
  const data: number[] = [];

  for (let i = 0; i < polygons.length; i++) {
    const j = permutation ? permutation[i] ?? i : i;
    if (i !== j) {
      console.log(i, j);
    }
    const c = initialFacetColors[j];
    for (let k = 0; k < polygons[i].points.length; k++) {
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

  const h1 = (
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

  const piece = (tag: PieceTag, ...facets: Polygon[]) => ({ tag, facets });
  const polygon = (tag: ColorName, points: Point[]) => ({ tag, points });

  return [
    // moving
    // cross section
    piece("h1", polygon("LIGHT_GREEN", h1)),
    // triangles
    piece("t1", polygon("SILVER", t1)),
    piece("t2", polygon("REDDISH_PINK", t2)),
    piece("t3", polygon("LIGHT_BLUE", t4)),
    piece("t4", polygon("BLUE", t5)),

    // square capped pieces
    piece(
      "s1",
      polygon("CYAN", s1),
      polygon("SILVER", tr1),
      polygon("REDDISH_PINK", tr2),
      polygon("GREEN", tr3),
      polygon("LIGHT_BLUE", tr4),
    ),
    piece(
      "s2",
      polygon("TEAL", s3),
      polygon("BLUE", rotateY(tr1)),
      polygon("SILVER", rotateY(tr2)),
      polygon("LIGHT_BLUE", rotateY(tr3)),
      polygon("ORANGE", rotateY(tr4)),
    ),
    piece(
      "s3",
      polygon("LIGHT_PURPLE", s4),
      polygon("BLUE", rotateX(tr1, 3)),
      polygon("YELLOW", rotateX(tr2, 3)),
      polygon("REDDISH_PINK", rotateX(tr3, 3)),
      polygon("SILVER", rotateX(tr4, 3)),
    ),

    // stationary
    // cross section
    piece("h2", polygon("LIGHT_GREEN", h1)),
    // triangles
    piece("t5", polygon("GREEN", t3)),
    piece("t6", polygon("YELLOW", t6)),
    piece("t7", polygon("PINK", t7)),
    piece("t8", polygon("ORANGE", t8)),
    piece(
      "s4",
      polygon("VIOLET", s2),
      polygon("LIGHT_BLUE", rotateX(tr1)),
      polygon("GREEN", rotateX(tr2)),
      polygon("PINK", rotateX(tr3)),
      polygon("ORANGE", rotateX(tr4)),
    ),
    piece(
      "s5",
      polygon("SKY_BLUE", s5),
      polygon("REDDISH_PINK", rotateY(tr1, 3)),
      polygon("YELLOW", rotateY(tr2, 3)),
      polygon("PINK", rotateY(tr3, 3)),
      polygon("GREEN", rotateY(tr4, 3)),
    ),
    piece(
      "s6",
      polygon("LIGHT_RED", s6),
      polygon("YELLOW", rotateY(tr1, 2)),
      polygon("BLUE", rotateY(tr2, 2)),
      polygon("ORANGE", rotateY(tr3, 2)),
      polygon("PINK", rotateY(tr4, 2)),
    ),
  ];
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

/*
function rotateAxis1(): Permutation {
  return {};
}
*/

function permCycle(perm: Permutation, ...items: number[]): void {
  for (let i = 0; i < items.length - 1; i++) {
    perm[items[i]] = items[i + 1];
  }
  perm[items[items.length - 1]] = items[0];
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
