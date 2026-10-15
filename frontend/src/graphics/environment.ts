// One native WebGL surface. No animation frames pass through React state.
export function createEnvironment(canvas: HTMLCanvasElement, setMode: (mode: string) => void, forceReduced = false) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' })
  if (!gl) { setMode('fallback'); return () => {} }
  const vertex = `
    precision highp float;
    attribute vec2 aParam;
    uniform float uTime;
    uniform float uAspect;
    uniform vec2 uPointer;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vArc;
    vec3 curve(float u) {
      float r = 1.1 + .38*cos(3.*u + .08*sin(uTime*.2));
      return vec3(r*cos(2.*u), r*sin(2.*u), .56*sin(3.*u));
    }
    mat3 rotate(float x, float y) {
      mat3 rx=mat3(1.,0.,0.,0.,cos(x),sin(x),0.,-sin(x),cos(x));
      mat3 ry=mat3(cos(y),0.,-sin(y),0.,1.,0.,sin(y),0.,cos(y));
      return ry*rx;
    }
    void main() {
      float u=aParam.x; float v=aParam.y;
      vec3 center=curve(u);
      vec3 tangent=normalize(curve(u+.001)-center);
      vec3 side=normalize(cross(tangent,vec3(0.,0.,1.)));
      vec3 up=normalize(cross(side,tangent));
      float radius=.205 + .045*sin(u*3. + uTime*.35);
      vec3 normal=cos(v)*side+sin(v)*up;
      mat3 rotation=rotate(.55+uTime*.065+uPointer.y*.10, -.3+uTime*.095+uPointer.x*.12);
      vec3 p=rotation*(center+radius*normal);
      p.y+=sin(uTime*.35)*.08;
      vNormal=rotation*normal;
      vPosition=p;
      vArc=u;
      float depth=4.5-p.z;
      gl_Position=vec4(p.x*2.4/uAspect,p.y*2.4,(depth-2.)*.4,depth);
    }`
  const fragment = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vArc;
    uniform float uTime;
    void main() {
      vec3 n=normalize(vNormal);
      vec3 view=normalize(vec3(0.,0.,4.5)-vPosition);
      vec3 light=normalize(vec3(-2.,4.,4.)-vPosition);
      float diffuse=max(dot(n,light),0.);
      float rim=pow(1.-max(dot(n,view),0.),2.8);
      float spec=pow(max(dot(reflect(-light,n),view),0.),65.);
      float stripe=pow(.5+.5*sin(vArc*32.+uTime*.2),28.);
      vec3 color=vec3(.006,.055,.032)+vec3(.02,.40,.19)*diffuse;
      color+=vec3(.16,.95,.55)*rim*.8;
      color+=vec3(.7,1.,.82)*spec*.85;
      color+=vec3(.03,.18,.09)*stripe*diffuse;
      gl_FragColor=vec4(color,1.);
    }`
  const shaders: WebGLShader[] = []
  const program = gl.createProgram()!
  const buffer = gl.createBuffer()!
  let frame = 0
  let stopped = false
  let last = 0
  let elapsed = 0
  let previous = 0
  let frames = 0
  let totalFrameMs = 0
  let targetFrameMs = 1000 / (window.innerWidth < 760 ? 30 : 60)
  const pointer = [0, 0]
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type)!
      shaders.push(shader)
      gl.shaderSource(shader, source); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed')
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Scene linking failed')
  } catch (error) {
    shaders.forEach(shader => gl.deleteShader(shader))
    gl.deleteProgram(program); gl.deleteBuffer(buffer)
    throw error
  }
  const params: number[] = []
  const segments = window.innerWidth < 760 ? 128 : 224
  const rings = 22
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rings; j++) {
      for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 0], [1, 1], [0, 1]]) {
        params.push((i+a)/segments*Math.PI*2, (j+b)/rings*Math.PI*2)
      }
    }
  }
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(params), gl.STATIC_DRAW)
  const attribute = gl.getAttribLocation(program, 'aParam')
  gl.enableVertexAttribArray(attribute)
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)
  const time = gl.getUniformLocation(program, 'uTime')
  const aspect = gl.getUniformLocation(program, 'uAspect')
  const parallax = gl.getUniformLocation(program, 'uPointer')
  gl.enable(gl.DEPTH_TEST)
  gl.clearColor(0, 0, 0, 0)

  function resize() {
    if (window.innerWidth < 760) targetFrameMs = Math.max(targetFrameMs, 1000/30)
    const bounds = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1 : 1.5)
    canvas.width = Math.max(1, Math.floor(bounds.width*dpr))
    canvas.height = Math.max(1, Math.floor(bounds.height*dpr))
    gl!.viewport(0, 0, canvas.width, canvas.height)
    gl!.uniform1f(aspect, canvas.width/canvas.height)
  }
  function draw(now: number) {
    if (stopped || document.hidden) return
    if (now-last >= targetFrameMs-1 || reduced.matches || forceReduced) {
      if (previous) {
        const delta = Math.min(now-previous, 100)
        elapsed += delta/1000
        totalFrameMs += delta
        frames++
        // Measured rendered frame rate; expose for QA, not a product claim.
        if (frames % 120 === 0) {
          const fps = Math.round(frames*1000/totalFrameMs)
          canvas.dataset.measuredFps = String(fps)
          if (fps < 24) targetFrameMs = 1000/30
        }
      }
      previous = now; last = now
      gl!.uniform1f(time, reduced.matches || forceReduced ? 2 : elapsed)
      gl!.uniform2f(parallax, pointer[0], pointer[1])
      gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT)
      gl!.drawArrays(gl!.TRIANGLES, 0, params.length/2)
      canvas.dataset.frames = String(frames)
      canvas.dataset.motion = reduced.matches || forceReduced ? 'reduced' : 'animated'
    }
    if (!reduced.matches && !forceReduced) frame = requestAnimationFrame(draw)
  }
  function resume() {
    cancelAnimationFrame(frame)
    previous = 0; last = 0
    if (!document.hidden && !stopped) frame = requestAnimationFrame(draw)
  }
  function move(event: PointerEvent) {
    if (reduced.matches || forceReduced) return
    pointer[0] = (event.clientX/window.innerWidth-.5)
    pointer[1] = (event.clientY/window.innerHeight-.5)
  }
  function lost(event: Event) {
    event.preventDefault(); stopped = true; cancelAnimationFrame(frame)
    setMode('fallback')
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  document.addEventListener('visibilitychange', resume)
  window.addEventListener('pointermove', move, { passive: true })
  reduced.addEventListener('change', resume)
  canvas.addEventListener('webglcontextlost', lost)
  resize(); setMode('webgl'); resume()
  return () => {
    stopped = true; cancelAnimationFrame(frame); observer.disconnect()
    document.removeEventListener('visibilitychange', resume)
    window.removeEventListener('pointermove', move)
    reduced.removeEventListener('change', resume)
    canvas.removeEventListener('webglcontextlost', lost)
    shaders.forEach(shader => gl.deleteShader(shader))
    gl.deleteBuffer(buffer); gl.deleteProgram(program)
  }
}
