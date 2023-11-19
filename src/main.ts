import { run } from "./polygon";

const canvas = document.querySelector("#glcanvas")! as HTMLCanvasElement;
const gl = canvas.getContext("webgl")!;

run(gl);
