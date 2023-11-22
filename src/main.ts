import { run } from "./truncated-octahedron";

const canvas = document.querySelector("#webgl-root")! as HTMLCanvasElement;
const gl = canvas.getContext("webgl")!;

run(gl);
