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
- [x] Tag pieces with their axis of rotation
- [x] fix colors
- [x] draw half the puzzle
- [x] draw arrays in two passes
- [x] animate
- [x] rotate camera and puzzle at independent speeds
- [x] Remove type safe builder pattern
- [x] permute positons instead of colors
- [x] filter pieces based on their type and normal axis
- [x] rotate any octant
- [ ] double check normals by deriving piece geometry from normals
- [x] Temporiality disable animation
- [ ] reimplement rotation animation
- [ ] reimplement action buffer
- [ ] implement inverse rotations
- [ ] Restore hexagonal cross sections for rotations

- [ ] outlines or gaps between pieces
- [ ] lighting
- [ ] less harsh background
- [ ] hot key to reset the camera to default orientation
- [ ] Organize modules for default export 
- [ ] rotate slices with keyboard controls 
-
*/
type Polygon = {
  color: ColorName;
  tag: FacetTag;
  points: Point[];
};

type TriangleTag = `t${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
type PieceTag =
  // triangle center
  | TriangleTag
  // square cap
  | `s${1 | 2 | 3 | 4 | 5 | 6}`
  // hexagonal cross section
  | `h${1 | 2}`;

type FacetTag = PieceTag | `tr-${1 | 2 | 3 | 4 | 5 | 6}-${1 | 2 | 3 | 4}`;

type Piece = {
  tag: PieceTag;
  normal: vec3;
  facets: Polygon[];
};
type Point = vec3;

const colors = {
  MAGENTA: rgb(210, 75, 208),
  SILVER: rgb(143, 143, 143),
  BLUE_VIOLET: rgb(119, 153, 252),
  SKY_BLUE: rgb(135, 206, 235),
  WHITE: rgb(212, 241, 252),
  LIGHT_GREEN: rgb(221, 250, 220),
  CORAL: rgb(244, 79, 130),
  RED: rgb(173, 25, 2),
  LIGHT_RED: rgb(232, 173, 191),
  LIGHT_PINK: rgb(252, 222, 255),
  LIGHT_PURPLE: rgb(196, 173, 234),
  CYAN: rgb(12, 249, 239),
  TEAL: rgb(33, 209, 163),
  VIOLET: rgb(94, 79, 160),
  YELLOW: rgb(178, 201, 43),
  BLUE: rgb(41, 67, 163),
  GREEN: rgb(35, 118, 49),
  ORANGE: rgb(235, 135, 21),
} as const;

colors satisfies Record<string, Color>;
type ColorName = keyof typeof colors;

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
const cameraMotions = {
  // wasdqe
  w: "-x",
  a: "-y",
  s: "+x",
  d: "+y",
  q: "+z",
  e: "-z",
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
  h: "+++",
  j: "+-+",
  k: "--+",
  l: "-++",

  y: "++-",
  u: "+--",
  i: "---",
  o: "-+-",
} as const;
actions satisfies Record<string, Axis>;
const actionKeys = Object.keys(actions);

type Sign = "+" | "-";
type Axis = `${Sign}${Sign}${Sign}`;
type Rotations = Record<Axis, (p: Point) => Point>;

function axisToVec(axis: Axis): vec3 {
  return axis.split("").map((c) => (c === "+" ? 1 : -1)) as vec3;
}

const rotations: Rotations = {
  "+++": (p) => [p[2], p[0], p[1]],
  "+-+": (p) => [-p[1], -p[2], p[0]],
  "--+": (p) => [-p[2], p[0], -p[1]],
  "-++": (p) => [-p[2], -p[0], p[1]],

  "---": (p) => [p[2], p[1], p[0]],
  "-+-": (p) => [-p[1], p[0], -p[2]],
  "++-": (p) => [-p[2], -p[1], p[0]],
  "+--": (p) => [-p[2], p[1], -p[0]],
};

function isActionKey(key: string): key is ActionKey {
  return actionKeys.includes(key);
}
type Actions = typeof actions;
type ActionKey = keyof Actions;
type Action = Axis;

function resetVertexData(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  pieces: Array<Piece>,
): number {
  const polygons = pieces.flatMap((p) => p.facets);
  const indices = indexPattern(polygons);
  setVertexIndices(gl, indices);
  setVertexColors(gl, program, colorArray(polygons));
  setVertexPositions(gl, program, polygonsToPositions(polygons));
  return indices.length;
}

// it takes 1.6 seconds to rotate the camera 120 degrees
const CAMERA_SPEED = (2 * Math.PI) / (3 * 1600);

export function run(gl: WebGLRenderingContext): void {
  // setup
  const program = default3DShaderProgram(gl);
  let pieces = initPieces();
  const indexCount = resetVertexData(gl, program, pieces);

  // state
  const activeCameraAxis = vec3.create();
  const cameraRotation = mat4.create();
  const transform = mat4.create();

  // times / durations in ms
  let then = 0;
  let delta = 0;
  let animatingAction: Action | undefined;

  document.onkeydown = (e) => {
    if (isCameraKey(e.key)) {
      const motion = cameraMotions[e.key];
      if (motion === "+x") {
        activeCameraAxis[0] = 1;
      } else if (motion === "-x") {
        activeCameraAxis[0] = -1;
      } else if (motion === "+y") {
        activeCameraAxis[1] = 1;
      } else if (motion === "-y") {
        activeCameraAxis[1] = -1;
      } else if (motion === "+z") {
        activeCameraAxis[2] = 1;
      } else if (motion === "-z") {
        activeCameraAxis[2] = -1;
      }
    } else if (animatingAction === undefined && isActionKey(e.key)) {
      const action = actions[e.key];
      animatingAction = action;
      sortPieces(action);
    }
  };

  document.onkeyup = (e) => {
    if (isCameraKey(e.key)) {
      const motion = cameraMotions[e.key];
      if (motion.endsWith("x")) {
        activeCameraAxis[0] = 0;
      } else if (motion.endsWith("y")) {
        activeCameraAxis[1] = 0;
      } else if (motion.endsWith("z")) {
        activeCameraAxis[2] = 0;
      }
    }
  };
  function sortPieces(action: Action) {
    console.log("action", action);
    const sorted = [];
    let i = 0;
    let j = pieces.length / 2;
    for (let piece of pieces) {
      const dotProduct = vec3.dot(axisToVec(action), piece.normal);
      if (dotProduct > 0) {
        sorted[i++] = piece;
      } else {
        sorted[j++] = piece;
      }
    }
    pieces = sorted;
  }

  function rotatePieces(action: Action) {
    for (let i = 0; i < pieces.length / 2; i++) {
      const piece = pieces[i];
      piece.normal = rotations[action](piece.normal);
      for (let polygon of piece.facets) {
        polygon.points = polygon.points.map(rotations[action]);
      }
    }
    resetVertexData(gl, program, pieces);
  }

  let frame = 0;
  const animationDuration = 400;
  function render(ms: number) {
    delta = ms - then;
    then = ms;
    if (animatingAction) {
      frame += delta;
      if (frame > animationDuration) {
        rotatePieces(animatingAction);
        frame = 0;
        animatingAction = undefined;
      }
    }

    if (activeCameraAxis.some((c) => c !== 0)) {
      mat4.fromRotation(transform, delta * CAMERA_SPEED, activeCameraAxis);
      mat4.multiply(cameraRotation, transform, cameraRotation);
    }

    resizeToScreen(gl);
    clearScene(gl);

    getDefaultProjectionMatrix(gl, transform);
    mat4.multiply(transform, transform, cameraRotation);
    setTransformMatrix(gl, program, transform);

    if (!animatingAction) {
      // draw in 1 pass
      drawElements(gl, gl.TRIANGLES, 0, indexCount);
    } else {
      // draw stationary
      drawElements(gl, gl.TRIANGLES, indexCount / 2, indexCount / 2);

      // draw rotating
      const animationMatrix = mat4.fromRotation(
        mat4.create(),
        ((2 * Math.PI) / 3) * (frame / animationDuration),
        axisToVec(animatingAction),
      );
      mat4.multiply(transform, transform, animationMatrix);

      setTransformMatrix(gl, program, transform);
      drawElements(gl, gl.TRIANGLES, 0, indexCount / 2);
    }

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
  const data: number[] = [];

  for (let i = 0; i < polygons.length; i++) {
    const c = colors[polygons[i].color];
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
  const t5 = rotateZ(t2);
  const t3 = rotateZ(t5);
  const t4 = rotateY(t1);
  const t6 = rotateZ(t4);
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

  const piece = (tag: PieceTag, normal: vec3, ...facets: Polygon[]): Piece => {
    return {
      tag,
      normal,
      facets,
    };
  };

  const polygon = (
    color: ColorName,
    tag: FacetTag,
    points: Point[],
  ): Polygon => ({
    color,
    tag,
    points,
  });

  return [
    // moving
    // cross section
    //piece("h1", [-1, -1, -1], polygon("LIGHT_GREEN", "h1", h1)),

    // triangles
    piece("t1", [1, 1, 1], polygon("SILVER", "t1", t1)),
    piece("t2", [-1, 1, 1], polygon("CORAL", "t2", t2)),
    piece("t3", [1, -1, 1], polygon("WHITE", "t3", t3)),
    piece("t4", [1, 1, -1], polygon("BLUE", "t4", t4)),

    // square capped pieces
    piece(
      "s1",
      [0, 0, 1],
      polygon("CYAN", "s1", s1),
      polygon("SILVER", "tr-1-1", tr1),
      polygon("CORAL", "tr-1-2", tr2),
      polygon("GREEN", "tr-1-3", tr3),
      polygon("WHITE", "tr-1-4", tr4),
    ),
    piece(
      "s2",
      [1, 0, 0],
      polygon("TEAL", "s2", s3),
      polygon("BLUE", "tr-2-1", rotateY(tr1)),
      polygon("SILVER", "tr-2-2", rotateY(tr2)),
      polygon("WHITE", "tr-2-3", rotateY(tr3)),
      polygon("ORANGE", "tr-2-4", rotateY(tr4)),
    ),
    piece(
      "s3",
      [0, 1, 0],
      polygon("LIGHT_PURPLE", "s3", s4),
      polygon("BLUE", "tr-3-1", rotateX(tr1, 3)),
      polygon("YELLOW", "tr-3-2", rotateX(tr2, 3)),
      polygon("CORAL", "tr-3-3", rotateX(tr3, 3)),
      polygon("SILVER", "tr-3-4", rotateX(tr4, 3)),
    ),

    // stationary
    // cross section
    // piece("h2", [1, 1, 1], polygon("LIGHT_GREEN", "h2", h1)),
    // triangles
    piece("t5", [-1, -1, 1], polygon("GREEN", "t5", t5)),
    piece("t6", [-1, 1, -1], polygon("YELLOW", "t6", t6)),
    piece("t7", [-1, -1, -1], polygon("MAGENTA", "t7", t7)),
    piece("t8", [1, -1, -1], polygon("ORANGE", "t8", t8)),
    piece(
      "s4",
      [0, -1, 0],
      polygon("VIOLET", "s4", s2),
      polygon("WHITE", "tr-4-1", rotateX(tr1)),
      polygon("GREEN", "tr-4-2", rotateX(tr2)),
      polygon("MAGENTA", "tr-4-3", rotateX(tr3)),
      polygon("ORANGE", "tr-4-4", rotateX(tr4)),
    ),
    piece(
      "s5",
      [-1, 0, 0],
      polygon("SKY_BLUE", "s5", s5),
      polygon("CORAL", "tr-5-1", rotateY(tr1, 3)),
      polygon("YELLOW", "tr-5-2", rotateY(tr2, 3)),
      polygon("MAGENTA", "tr-5-3", rotateY(tr3, 3)),
      polygon("GREEN", "tr-5-4", rotateY(tr4, 3)),
    ),
    piece(
      "s6",
      [0, 0, -1],
      polygon("LIGHT_RED", "s6", s6),
      polygon("YELLOW", "tr-6-1", rotateY(tr1, 2)),
      polygon("BLUE", "tr-6-2", rotateY(tr2, 2)),
      polygon("ORANGE", "tr-6-3", rotateY(tr3, 2)),
      polygon("MAGENTA", "tr-6-4", rotateY(tr4, 2)),
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

/*
function permCycle(perm: Permutation, ...items: number[]): void {
  for (let i = 0; i < items.length - 1; i++) {
    perm[items[i]] = items[i + 1];
  }
  perm[items[items.length - 1]] = items[0];
}
*/
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
