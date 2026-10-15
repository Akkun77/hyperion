import { pulseTone, ObservedSignal } from '../workspace/liveSignal'
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
    uniform float uSignalAge;
    uniform float uSignalTone;
    uniform float uDemoActive;
    uniform float uDemoArc;
    uniform float uDemoFinding;
    uniform float uDemoTone;
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
      // A localized signal travels along the actual parametric centerline.
      // Circular distance makes the seam at 0 / 2pi continuous; this is ambient, not telemetry.
      float signalArc=mod(uTime*.65,6.2831853);
      float arcDistance=abs(vArc-signalArc);
      arcDistance=min(arcDistance,6.2831853-arcDistance);
      float pulse=exp(-pow(arcDistance/.16,2.));
      color+=vec3(.28,.95,.60)*pulse*(.35+.65*diffuse);
      // A separate one-shot accent is driven by a deduplicated observed batch.
      float eventArc=mod(uSignalAge*2.4,6.2831853);
      float eventDistance=abs(vArc-eventArc);
      eventDistance=min(eventDistance,6.2831853-eventDistance);
      float eventPulse=exp(-pow(eventDistance/.22,2.))*max(0.,1.-uSignalAge/2.6);
      vec3 eventColor=uSignalTone>2.5 ? vec3(1.,.18,.09) : uSignalTone>1.5 ? vec3(1.,.59,.16) : vec3(.4,1.,.72);
      color+=eventColor*eventPulse*.95;

      // Living Security Core: Request signal traveling through actual 3D loop geometry
      if (uDemoActive > 0.5) {
        float dDist = abs(vArc - uDemoArc);
        dDist = min(dDist, 6.2831853 - dDist);
        float dHead = exp(-pow(dDist / 0.12, 2.0));
        float dTrailDist = mod(uDemoArc - vArc + 6.2831853, 6.2831853);
        float dTrail = exp(-dTrailDist / 0.28) * (1.0 - smoothstep(0.0, 0.72, dTrailDist));
        vec3 dColor = uDemoTone > 2.5 ? vec3(1.0, 0.32, 0.18) : uDemoTone > 1.5 ? vec3(1.0, 0.65, 0.20) : vec3(0.42, 1.0, 0.75);
        color += dColor * (dHead * 1.7 + dTrail * 0.8) * (0.4 + 0.6 * diffuse);

        // Breach sector illumination on confirmed security finding
        if (uDemoFinding > 0.5) {
          float breachDist = abs(vArc - 4.45);
          breachDist = min(breachDist, 6.2831853 - breachDist);
          float breachGlow = exp(-pow(breachDist / 0.45, 2.0));
          vec3 coralAlert = vec3(1.0, 0.34, 0.18);
          float breath = 0.7 + 0.3 * sin(uTime * 4.0);
          color += coralAlert * breachGlow * breath * 1.35;
        }
      }
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
  const pointerTarget = [0, 0]
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
  const signalAge = gl.getUniformLocation(program, 'uSignalAge')
  const signalTone = gl.getUniformLocation(program, 'uSignalTone')
  const demoActiveLoc = gl.getUniformLocation(program, 'uDemoActive')
  const demoArcLoc = gl.getUniformLocation(program, 'uDemoArc')
  const demoFindingLoc = gl.getUniformLocation(program, 'uDemoFinding')
  const demoToneLoc = gl.getUniformLocation(program, 'uDemoTone')

  const STAGE_ARCS = [0.0, 0.65, 1.55, 2.45, 3.5, 4.45, 5.35, 6.2]
  const STAGE_ID_MAP: Record<string, number> = {
    'incoming-request': 1,
    'endpoint-catalog': 2,
    'traffic-audit': 3,
    'detector-eval': 4,
    'alert-dispatch': 5,
    'risk-recalculation': 6,
    'evidence-link': 7
  }

  let demoActive = 0
  let demoStage = 0
  let demoFinding = 0
  let demoTone = 1.0
  let demoArc = 0.0
  let targetDemoArc = 0.0

  function handleDemoState(event: Event) {
    const detail = (event as CustomEvent<any>).detail || {}
    if (detail.reset) {
      demoActive = 0; demoStage = 0; demoFinding = 0; demoTone = 1.0
      demoArc = 0.0; targetDemoArc = 0.0
      canvas.dataset.demoActive = '0'
      canvas.dataset.demoStage = '0'
      return
    }
    demoActive = 1
    const stageNum = typeof detail.stage === 'number' ? detail.stage :
                     detail.stage ? (STAGE_ID_MAP[detail.stage] ?? 1) : 1
    demoStage = stageNum
    targetDemoArc = STAGE_ARCS[Math.min(stageNum, 7)] || 0.0

    const isFinding = detail.finding || detail.signals?.some((s: any) => s.kind === 'finding') || stageNum >= 5
    demoFinding = isFinding ? 1 : 0
    demoTone = isFinding ? 3.0 : stageNum >= 4 ? 2.0 : 1.0

    canvas.dataset.demoActive = '1'
    canvas.dataset.demoStage = String(demoStage)
    canvas.dataset.demoFinding = String(demoFinding)
  }

  let observedAt = -10000
  let tone = 1
  function observation(event: Event) {
    const detail = (event as CustomEvent<{disconnected?:boolean;signals:ObservedSignal[]}>).detail
    if (detail.disconnected) { observedAt = -10000; return }
    if (!detail.signals.length || reduced.matches || forceReduced) return
    observedAt = performance.now(); tone = pulseTone(detail.signals)
    const counter=event.type==='hyperion-demo-stage'?'demoStages':'signalBatches'
    canvas.dataset[counter] = String(Number(canvas.dataset[counter] || 0)+1)
    canvas.dataset.signalTone = String(tone)
  }
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
      pointer[0]+=(pointerTarget[0]-pointer[0])*.08;pointer[1]+=(pointerTarget[1]-pointer[1])*.08
      gl!.uniform2f(parallax, pointer[0], pointer[1])
      gl!.uniform1f(signalAge, reduced.matches || forceReduced ? 100 : (now-observedAt)/1000)
      gl!.uniform1f(signalTone, tone)

      if (demoActive > 0.5) {
        const diff = targetDemoArc - demoArc
        demoArc += diff * 0.14
        gl!.uniform1f(demoActiveLoc, 1.0)
        gl!.uniform1f(demoArcLoc, demoArc)
        gl!.uniform1f(demoFindingLoc, demoFinding)
        gl!.uniform1f(demoToneLoc, demoTone)
      } else {
        gl!.uniform1f(demoActiveLoc, 0.0)
        gl!.uniform1f(demoArcLoc, 0.0)
        gl!.uniform1f(demoFindingLoc, 0.0)
        gl!.uniform1f(demoToneLoc, 1.0)
      }

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
    pointerTarget[0] = (event.clientX/window.innerWidth-.5)
    pointerTarget[1] = (event.clientY/window.innerHeight-.5)
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
  window.addEventListener('hyperion-observation', observation)
  window.addEventListener('hyperion-demo-stage', observation)
  window.addEventListener('hyperion-demo-stage', handleDemoState)
  window.addEventListener('hyperion-demo-reset', handleDemoState)
  resize(); setMode('webgl'); resume()
  return () => {
    stopped = true; cancelAnimationFrame(frame); observer.disconnect()
    document.removeEventListener('visibilitychange', resume)
    window.removeEventListener('pointermove', move)
    reduced.removeEventListener('change', resume)
    canvas.removeEventListener('webglcontextlost', lost)
    window.removeEventListener('hyperion-observation', observation)
    window.removeEventListener('hyperion-demo-stage', observation)
    window.removeEventListener('hyperion-demo-stage', handleDemoState)
    window.removeEventListener('hyperion-demo-reset', handleDemoState)
    shaders.forEach(shader => gl.deleteShader(shader))
    gl.deleteBuffer(buffer); gl.deleteProgram(program)
  }
}
