import { drawFullscreen, FULLSCREEN_VERTEX, fullscreenQuad, shaderProgram, type MotionEngine, clamp } from './gpu'
import { scenarioById, type PacketDecision, type PacketEvent } from './packetFixtures'

const BACKGROUND = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
float line(float x,float width){return 1.-smoothstep(0.,width,abs(x));}
void main(){
  vec2 uv=vUv;
  vec2 q=uv*vec2(uResolution.x/uResolution.y,1.);
  vec3 color=vec3(.010,.027,.025);
  float horizontal=line(fract(uv.y*15.)-.5,.014)*.045;
  float vertical=line(fract(q.x*16.)-.5,.013)*.026;
  color+=vec3(.09,.28,.21)*(horizontal+vertical);
  float boundary=line(uv.x-.5,.0022);
  float halo=exp(-abs(uv.x-.5)*48.);
  color+=vec3(.16,.75,.44)*boundary*.82+vec3(.04,.35,.22)*halo*.35;
  float aperture=abs(length((uv-vec2(.5,.5))*vec2(uResolution.x/uResolution.y,1.))-.20);
  color+=vec3(.04,.21,.15)*(1.-smoothstep(.006,.018,aperture))*.28;
  for(int i=0;i<3;i++){
    float lane=.31+float(i)*.19;
    float track=line(uv.y-lane,.0019);
    color+=vec3(.14,.36,.27)*track*(uv.x<.5? .72:.56);
  }
  for(int i=0;i<5;i++){
    float f=float(i);
    vec2 node=vec2(.72+sin(f*2.2)*.11,.22+f*.14);
    float d=length((uv-node)*vec2(uResolution.x/uResolution.y,1.));
    color+=vec3(.18,.72,.43)*exp(-d*95.)*.54+vec3(.13,.39,.28)*exp(-d*22.)*.12;
  }
  float edge=smoothstep(1.15,.1,length((uv-.5)*vec2(1.3,1.)));
  color*=.28+.72*edge;
  outColor=vec4(color,1.);
}`

const POINT_VERTEX = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
in float aSize;
in float aAlpha;
out vec3 vColor;
out float vAlpha;
void main(){gl_Position=vec4(aPosition.x*2.-1.,1.-aPosition.y*2.,0.,1.);gl_PointSize=aSize;vColor=aColor;vAlpha=aAlpha;}`
const POINT_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  float core=1.-smoothstep(.28,.53,d);
  float ring=(1.-smoothstep(.68,.81,d))*smoothstep(.49,.60,d);
  float halo=exp(-d*d*3.5)*.36;
  float alpha=(core*.9+ring*.65+halo)*vAlpha;
  outColor=vec4(vColor*(core*1.2+ring*.65+halo),alpha);
}`
const LINE_VERTEX = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
in float aAlpha;
out vec3 vColor;
out float vAlpha;
void main(){gl_Position=vec4(aPosition.x*2.-1.,1.-aPosition.y*2.,0.,1.);vColor=aColor;vAlpha=aAlpha;}`
const LINE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;
void main(){outColor=vec4(vColor,vAlpha);}`

const colorFor=(decision:PacketDecision):[number,number,number] => decision==='ALLOW'?[.21,.92,.62]:decision==='FLAG'?[1.,.66,.27]:[1.,.30,.28]
const ease=(t:number)=>t*t*(3-2*t)

export class PacketRenderer implements MotionEngine {
  private gl: WebGL2RenderingContext
  private bgProgram: WebGLProgram
  private pointProgram: WebGLProgram
  private lineProgram: WebGLProgram
  private quad: WebGLBuffer
  private pointBuffer: WebGLBuffer
  private lineBuffer: WebGLBuffer
  private width=1
  private height=1
  private time=0
  private scenarioId='mixed'
  private visible:{event:PacketEvent,x:number,y:number,alpha:number}[]=[]
  constructor(gl:WebGL2RenderingContext){
    this.gl=gl
    this.bgProgram=shaderProgram(gl,FULLSCREEN_VERTEX,BACKGROUND)
    this.pointProgram=shaderProgram(gl,POINT_VERTEX,POINT_FRAGMENT)
    this.lineProgram=shaderProgram(gl,LINE_VERTEX,LINE_FRAGMENT)
    this.quad=fullscreenQuad(gl)
    const point=gl.createBuffer(),line=gl.createBuffer()
    if(!point||!line)throw new Error('Cannot allocate packet buffers')
    this.pointBuffer=point;this.lineBuffer=line
  }
  resize(width:number,height:number){this.width=width;this.height=height}
  setScenario(id:string){this.scenarioId=scenarioById(id).id;this.time=0;this.visible=[]}
  reset(){this.time=0;this.visible=[]}
  step(){this.time=Math.min(8.5,this.time+1.1)}
  private position(event:PacketEvent){
    const t=this.time-event.offset
    if(t<0)return {x:.12,y:event.lane,alpha:0}
    const p=clamp(t/3.3)
    if(event.decision==='BLOCK'){
      const before=clamp(p/.58)
      const after=clamp((p-.58)/.42)
      return {x:.12+.38*ease(before)-.04*after,y:event.lane+.21*ease(after),alpha:clamp(1-after*.97)}
    }
    return {x:.12+.75*ease(p),y:event.lane-Math.sin(p*Math.PI)*.035,alpha:clamp(1-Math.max(0,t-4.2)/1.2)}
  }
  frame(dt:number,elapsed:number){
    if(dt>0)this.time+=dt
    if(this.time>8.7)this.time=0
    const gl=this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height)
    gl.disable(gl.BLEND)
    gl.useProgram(this.bgProgram)
    gl.uniform2f(gl.getUniformLocation(this.bgProgram,'uResolution'),this.width,this.height)
    gl.uniform1f(gl.getUniformLocation(this.bgProgram,'uTime'),elapsed)
    drawFullscreen(gl,this.bgProgram,this.quad)
    const scenario=scenarioById(this.scenarioId)
    this.visible=scenario.events.map(event=>({event,...this.position(event)})).filter(item=>item.alpha>.025)
    const points:number[]=[],lines:number[]=[]
    for(const item of this.visible){
      const [r,g,b]=colorFor(item.event.decision)
      const size=Math.min(this.width,this.height)*.095
      points.push(item.x,item.y,r,g,b,size,item.alpha)
      if(item.event.decision==='BLOCK'){
        const split=clamp((this.time-item.event.offset-1.9)/1.3)
        if(split>0) for(let fragment=0;fragment<5;fragment++){
          const angle=fragment*2.4
          points.push(item.x+Math.cos(angle)*split*.052,item.y+Math.sin(angle)*split*.075,r,g,b,size*.25,item.alpha*(1-split)*.75)
        }
      }
      const start=Math.max(.12,item.x-.14)
      lines.push(start,item.y,r,g,b,item.alpha*.04,item.x,item.y,r,g,b,item.alpha*.7)
    }
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE)
    if(lines.length){
      gl.useProgram(this.lineProgram);gl.bindBuffer(gl.ARRAY_BUFFER,this.lineBuffer)
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lines),gl.DYNAMIC_DRAW)
      const stride=6*4
      for(const [name,size,offset] of [['aPosition',2,0],['aColor',3,8],['aAlpha',1,20]] as const){const loc=gl.getAttribLocation(this.lineProgram,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset)}
      gl.drawArrays(gl.LINES,0,lines.length/6)
    }
    if(points.length){
      gl.useProgram(this.pointProgram);gl.bindBuffer(gl.ARRAY_BUFFER,this.pointBuffer)
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.DYNAMIC_DRAW)
      const stride=7*4
      for(const [name,size,offset] of [['aPosition',2,0],['aColor',3,8],['aSize',1,20],['aAlpha',1,24]] as const){const loc=gl.getAttribLocation(this.pointProgram,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset)}
      gl.drawArrays(gl.POINTS,0,points.length/7)
    }
    gl.disable(gl.BLEND)
  }
  pick(x:number,y:number){
    const hit=this.visible.filter(item=>Math.hypot((x-item.x)*this.width,(y-item.y)*this.height)<Math.min(this.width,this.height)*.043).sort((a,b)=>b.alpha-a.alpha)[0]
    return hit?.event.id||null
  }
  dispose(){const gl=this.gl;gl.deleteBuffer(this.quad);gl.deleteBuffer(this.pointBuffer);gl.deleteBuffer(this.lineBuffer);gl.deleteProgram(this.bgProgram);gl.deleteProgram(this.pointProgram);gl.deleteProgram(this.lineProgram)}
}
