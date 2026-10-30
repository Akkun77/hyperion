export interface MotionEngine {
  frame(dt: number, elapsed: number): void
  resize(width: number, height: number): void
  pointer?(x: number, y: number, dx: number, dy: number, down: boolean): void
  pick?(x: number, y: number): string | null
  setProgress?(value: number): void
  setScenario?(id: string): void
  reset(): void
  step?(): void
  dispose(): void
}

export function shaderProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const shaders: WebGLShader[] = []
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Cannot create shader')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Shader compilation failed'
      gl.deleteShader(shader)
      shaders.forEach(item => gl.deleteShader(item))
      throw new Error(message)
    }
    shaders.push(shader)
  }
  const program = gl.createProgram()
  if (!program) throw new Error('Cannot create WebGL program')
  shaders.forEach(shader => gl.attachShader(program, shader))
  gl.linkProgram(program)
  shaders.forEach(shader => gl.deleteShader(shader))
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Shader linking failed'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}

export const FULLSCREEN_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() { vUv = aPosition * .5 + .5; gl_Position = vec4(aPosition, 0., 1.); }`

export function fullscreenQuad(gl: WebGL2RenderingContext) {
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('Cannot create vertex buffer')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
  return buffer
}

export function drawFullscreen(gl: WebGL2RenderingContext, program: WebGLProgram, quad: WebGLBuffer) {
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  const location = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

export function fitCanvas(canvas: HTMLCanvasElement, cap = 1.5) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, cap)
  const width = Math.max(1, Math.round(rect.width * dpr))
  const height = Math.max(1, Math.round(rect.height * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  return { width, height }
}

export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
