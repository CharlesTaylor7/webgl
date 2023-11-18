import source from "./shaders/cube";

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
els.vertex.value = source.vertex;
els.fragment.value = source.fragment;
update();

// apply callbacks
applyCallbacks("vertex");
applyCallbacks("fragment");

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log("reload", newModule);
    applyCallbacks("vertex");
    applyCallbacks("fragment");
  });
}

function update() {
  compileShader(shaders.vertex, els.vertex.value);
  const vsError = gl.getShaderInfoLog(shaders.vertex);

  compileShader(shaders.fragment, els.fragment.value);
  const fsError = gl.getShaderInfoLog(shaders.fragment)!;

  gl.linkProgram(program);
  const linkError = gl.getProgramInfoLog(program)!;

  errorEl.value = `Vertex Shader: ${vsError}\n Fragment Shader: ${fsError}\n Link status: ${linkError}`;
}

function applyCallbacks(shaderType: keyof typeof shaders) {
  els[shaderType].onchange = update;
  els[shaderType].onkeydown = function (e: Event) {
    const key = (e as KeyboardEvent).key;
    if (key == "Enter") {
      update();
    }
  };
}

function compileShader(shader: WebGLShader, source: string) {
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
}
