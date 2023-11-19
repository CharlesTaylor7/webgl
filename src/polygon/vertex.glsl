attribute vec4 vertexPosition;
attribute vec4 vertexColor;

varying lowp vec4 fragmentColor;

void main(void) {
  gl_Position = vertexPosition;
  fragmentColor = vertexColor;
}
