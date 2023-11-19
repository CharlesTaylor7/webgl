attribute vec4 position;
attribute vec4 color;

uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;

varying lowp vec4 fragmentColor;

void main(void) {
  gl_Position = projectionMatrix * modelMatrix * position;
  fragmentColor = color;
}
