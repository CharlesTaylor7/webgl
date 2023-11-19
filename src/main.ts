import { run } from "./rotating-octohedron";

const canvas = document.querySelector("#glcanvas")! as HTMLCanvasElement;
const gl = canvas.getContext("webgl")!;

run(gl);
