import { run } from "./center-cuts";

const canvas = document.querySelector("#webgl-root")! as HTMLCanvasElement;
const gl = canvas.getContext("webgl")!;

run(gl);
