import { drawFullscreen, FULLSCREEN_VERTEX, fullscreenQuad, shaderProgram, type MotionEngine, clamp } from './gpu'

const UPDATE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uState;
uniform vec2 uPointer;
uniform vec2 uImpulse;
uniform vec2 uAspect;
uniform float uForce;
uniform float uDt;
void main() {
  vec2 current = (texture(uState, vUv).rg - .5) * 2.;
  vec2 back = clamp(vUv - current * uDt * .24, vec2(.002), vec2(.998));
  vec4 previous = texture(uState, back);
  vec2 velocity = (previous.rg - .5) * 2. * exp(-uDt * 1.6);
  float ink = previous.b * exp(-uDt * .25);
  vec2 delta = (vUv - uPointer) * uAspect;
  float brush = exp(-dot(delta, delta) * 92.) * uForce;
  vec2 vortex = vec2(-delta.y, delta.x) * brush * .7;
  velocity += uImpulse * brush * 1.5 + vortex * uDt * 6.;
  velocity = clamp(velocity, vec2(-.96), vec2(.96));
  ink = clamp(ink + brush * .14, 0., 1.);
  outColor = vec4(velocity * .5 + .5, ink, 1.);
}`

const DISPLAY = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uTime;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+1.), f.x), f.y);
}
void main() {
  vec2 uv = vUv;
  vec4 state = texture(uState, uv);
  vec2 velocity = (state.rg - .5) * 2.;
  float ink = state.b;
  float leftInk = texture(uState, uv - vec2(uTexel.x, 0)).b;
  float rightInk = texture(uState, uv + vec2(uTexel.x, 0)).b;
  float downInk = texture(uState, uv - vec2(0, uTexel.y)).b;
  float upInk = texture(uState, uv + vec2(0, uTexel.y)).b;
  vec3 normal = normalize(vec3((leftInk-rightInk)*2.3-velocity.x*.6, (downInk-upInk)*2.3-velocity.y*.6, .72));
  vec2 p = (uv-.5) * vec2(uResolution.x/uResolution.y, 1.);
  vec2 warp = p + velocity * .19 + normal.xy * ink * .12;
  float n = noise(warp*3.8 + vec2(uTime*.045, -uTime*.025));
  float vein = sin(warp.x*19. + warp.y*7. + n*9. + sin(warp.y*5.)*2.);
  float fine = sin(warp.x*53. - warp.y*17. + n*13.);
  float grain = noise(warp*37.);
  float mineral = smoothstep(.36, .92, n*.72 + vein*.18 + fine*.035 + ink*.5);
  vec3 obsidian = vec3(.013,.027,.025);
  vec3 deepGreen = vec3(.025,.105,.079);
  vec3 emerald = vec3(.10,.42,.29);
  vec3 silver = vec3(.60,.72,.68);
  vec3 color = mix(obsidian, deepGreen, mineral);
  color = mix(color, emerald, smoothstep(.3,.87, ink + mineral*.32)*.56);
  float diffuse = max(dot(normal, normalize(vec3(-.48,.72,.55))), 0.);
  float specular = pow(max(dot(reflect(normalize(vec3(.54,-.62,-.8)), normal), vec3(0,0,1)),0.), 28.);
  float edge = pow(1. - max(normal.z, 0.), 2.);
  color += silver * (specular*.56 + edge*.12) * (.5 + ink);
  color += emerald * diffuse * (.07 + ink*.24);
  color += (grain-.5)*.018;
  float vignette = smoothstep(1.22,.18,length(p));
  color *= .35 + .65*vignette;
  color += vec3(.02,.10,.075) * exp(-length(p-vec2(-.22,.16))*4.)*.25;
  outColor = vec4(pow(max(color,vec3(0.)),vec3(.88)),1.);
}`

export class FluidField implements MotionEngine {
  private gl: WebGL2RenderingContext
  private updateProgram: WebGLProgram
  private displayProgram: WebGLProgram
  private quad: WebGLBuffer
  private textures: WebGLTexture[] = []
  private framebuffers: WebGLFramebuffer[] = []
  private read = 0
  private size = 256
  private seed = new Uint8Array(0)
  private width = 1
  private height = 1
  private px = .5
  private py = .5
  private vx = 0
  private vy = 0
  private force = 0
  private dragging = false
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.updateProgram = shaderProgram(gl, FULLSCREEN_VERTEX, UPDATE)
    this.displayProgram = shaderProgram(gl, FULLSCREEN_VERTEX, DISPLAY)
    this.quad = fullscreenQuad(gl)
    this.allocate()
  }
  private allocate() {
    const gl = this.gl
    const seed = new Uint8Array(this.size * this.size * 4)
    for (let y=0; y<this.size; y++) for (let x=0; x<this.size; x++) {
      const i = (y*this.size+x)*4
      const u=x/this.size-.5, v=y/this.size-.5
      const plume = Math.exp(-((u+.14)**2*15+(v-.04)**2*26))*.52 + Math.exp(-((u-.24)**2*24+(v+.17)**2*22))*.28
      seed[i]=128; seed[i+1]=128; seed[i+2]=Math.min(255,Math.round(plume*255)); seed[i+3]=255
    }
    this.seed=seed
    for(let i=0;i<2;i++) {
      const texture=gl.createTexture(), framebuffer=gl.createFramebuffer()
      if(!texture||!framebuffer) throw new Error('Cannot allocate fluid field')
      gl.bindTexture(gl.TEXTURE_2D,texture)
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,this.size,this.size,0,gl.RGBA,gl.UNSIGNED_BYTE,seed)
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0)
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error('Fluid framebuffer incomplete')
      this.textures.push(texture); this.framebuffers.push(framebuffer)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null)
  }
  resize(width: number,height: number) { this.width=width; this.height=height }
  pointer(x: number,y: number,dx: number,dy: number,down: boolean) {
    if(!down&&dx===0&&dy===0){this.dragging=false;return}
    this.px=clamp(x); this.py=clamp(1-y)
    this.vx=clamp(dx*7,-.7,.7)
    this.vy=clamp(-dy*7,-.7,.7)
    this.dragging=down
    this.force=Math.min(1,Math.max(this.force, down ? .95 : .48))
  }
  frame(dt: number,elapsed: number) {
    const gl=this.gl
    if(dt>0) {
      const write=1-this.read
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffers[write])
      gl.viewport(0,0,this.size,this.size)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.textures[this.read])
      gl.useProgram(this.updateProgram)
      gl.uniform1i(gl.getUniformLocation(this.updateProgram,'uState'),0)
      gl.uniform2f(gl.getUniformLocation(this.updateProgram,'uPointer'),this.px,this.py)
      gl.uniform2f(gl.getUniformLocation(this.updateProgram,'uImpulse'),this.vx,this.vy)
      gl.uniform2f(gl.getUniformLocation(this.updateProgram,'uAspect'),this.width/this.height,1)
      gl.uniform1f(gl.getUniformLocation(this.updateProgram,'uForce'),this.force)
      gl.uniform1f(gl.getUniformLocation(this.updateProgram,'uDt'),Math.min(dt,.05))
      drawFullscreen(gl,this.updateProgram,this.quad)
      this.read=write
      this.vx*=this.dragging ? .80 : .89; this.vy*=this.dragging ? .80 : .89; this.force*=this.dragging ? .90 : .94
      if(this.force<.003) this.force=0
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null)
    gl.viewport(0,0,this.width,this.height)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.textures[this.read])
    gl.useProgram(this.displayProgram)
    gl.uniform1i(gl.getUniformLocation(this.displayProgram,'uState'),0)
    gl.uniform2f(gl.getUniformLocation(this.displayProgram,'uTexel'),1/this.size,1/this.size)
    gl.uniform2f(gl.getUniformLocation(this.displayProgram,'uResolution'),this.width,this.height)
    gl.uniform1f(gl.getUniformLocation(this.displayProgram,'uTime'),elapsed)
    drawFullscreen(gl,this.displayProgram,this.quad)
  }
  reset() { this.force=0; this.vx=0; this.vy=0; this.dragging=false; this.read=0; this.textures.forEach((texture)=>{this.gl.bindTexture(this.gl.TEXTURE_2D,texture);this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA8,this.size,this.size,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,this.seed)}) }
  dispose() { const gl=this.gl; this.textures.forEach(x=>gl.deleteTexture(x));this.framebuffers.forEach(x=>gl.deleteFramebuffer(x));gl.deleteBuffer(this.quad);gl.deleteProgram(this.updateProgram);gl.deleteProgram(this.displayProgram) }
}
