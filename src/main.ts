import { run } from "./rotating-cube";

const canvas = document.querySelector("#glcanvas")! as HTMLCanvasElement;
const gl = canvas.getContext("webgl")!;

run(gl);
