import { run } from "./truncated-cube";

const canvas = document.querySelector("#webgl-root")! as HTMLCanvasElement;
const gl = canvas.getContext("webgl")!;

run(gl);
