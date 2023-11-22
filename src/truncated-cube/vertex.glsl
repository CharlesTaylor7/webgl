attribute vec4 vertexPosition;
attribute vec4 vertexColor;

uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;

varying lowp vec4 fragmentColor;

void main(void) {
  gl_Position = projectionMatrix * modelMatrix * vertexPosition;
  fragmentColor = vertexColor;
}
