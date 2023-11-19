import source from "./shaders/cube";

if (import.meta.hot) {
  import.meta.hot.accept((newModule: any) => {
    console.log("reload", newModule);
    // applyCallbacks("vertex", newModule.update);
    // applyCallbacks("fragment", newModule.update);
  });
}

const canvas = document.querySelector("#glcanvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl")!;

const errorEl: HTMLTextAreaElement = document.querySelector("#output")!;

const shaders = {
  vertex: gl.createShader(gl.VERTEX_SHADER)!,
  fragment: gl.createShader(gl.FRAGMENT_SHADER)!,
};

const els = {
  vertex: document.querySelector("#vertexShader")! as HTMLTextAreaElement,
  fragment: document.querySelector("#fragmentShader")! as HTMLTextAreaElement,
};

const program = gl.createProgram()!;
gl.attachShader(program, shaders.vertex);
gl.attachShader(program, shaders.fragment);

// apply initial state
if (!els.vertex.value.trim().length && !els.fragment.value.trim().length) {
  els.vertex.value = source.vertex;
  els.fragment.value = source.fragment;
  update();
}

// apply callbacks
applyCallbacks("vertex", update);
applyCallbacks("fragment", update);

export function update() {
  compileShader(shaders.vertex, els.vertex.value);
  const vsError = gl.getShaderInfoLog(shaders.vertex);
  if (vsError?.length) {
    errorEl.value = `VertexShader:\n${vsError}`;
    return;
  }

  compileShader(shaders.fragment, els.fragment.value);
  const fsError = gl.getShaderInfoLog(shaders.fragment)!;
  if (fsError?.length) {
    errorEl.value = `Fragme:\n${fsError}`;
    return;
  }

  gl.linkProgram(program);
  const linkError = gl.getProgramInfoLog(program)!;
  if (linkError?.length) {
    errorEl.value = `ProgramLink:\n${linkError}`;
    return;
  }

  errorEl.value = ":check:";
}

function applyCallbacks(
  shaderType: keyof typeof shaders,
  callback: () => void,
) {
  els[shaderType].onchange = callback;
  els[shaderType].onkeydown = function (e: Event) {
    const key = (e as KeyboardEvent).key;
    if (key == "Enter") {
      callback();
    }
  };
}

function compileShader(shader: WebGLShader, source: string) {
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
}
