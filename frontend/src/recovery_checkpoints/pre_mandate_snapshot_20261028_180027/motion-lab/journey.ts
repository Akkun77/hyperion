import { drawFullscreen, FULLSCREEN_VERTEX, fullscreenQuad, shaderProgram, type MotionEngine, clamp } from './gpu'

const SCENE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uProgress;
uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 unite(vec2 a,vec2 b){return a.x<b.x?a:b;}
vec2 scene(vec3 p){
  vec2 result=vec2(100.,0.);
  for(int i=0;i<10;i++){
    float f=float(i);
    vec3 center=vec3(sin(f*2.31)*2.7,cos(f*3.17)*1.8,1.5+f*.73);
    result=unite(result,vec2(length(p-center)-(.095+.04*fract(f*.37)),1.));
  }
  float portal=length(vec2(length(p.xy)-2.06,p.z-9.7))-.105;
  result=unite(result,vec2(portal,2.));
  for(int i=0;i<4;i++){
    float angle=float(i)*1.570796;
    vec2 corner=vec2(cos(angle),sin(angle))*2.06;
    float rail=length(p.xy-corner)-.022;
    rail=max(rail,max(10.8-p.z,p.z-24.));
    result=unite(result,vec2(rail,3.));
  }
  if(p.z>10.5&&p.z<24.5){
    float z=mod(p.z-10.5,2.1)-1.05;
    float ring=length(vec2(length(p.xy)-2.0,z))-.038;
    result=unite(result,vec2(ring,3.));
  }
  for(int i=0;i<7;i++){
    float f=float(i), angle=f*6.283185/7.;
    vec3 center=vec3(cos(angle)*2.45,sin(angle)*1.52,29.4+sin(angle*2.)*.65);
    result=unite(result,vec2(length(p-center)-.23,4.));
  }
  result=unite(result,vec2(length(p-vec3(0.,0.,30.3))-.56,5.));
  return result;
}
vec3 normalAt(vec3 p){
  vec2 e=vec2(.012,0.);
  return normalize(vec3(scene(p+e.xyy).x-scene(p-e.xyy).x,scene(p+e.yxy).x-scene(p-e.yxy).x,scene(p+e.yyx).x-scene(p-e.yyx).x));
}
void main(){
  vec2 uv=(vUv-.5)*vec2(uResolution.x/uResolution.y,1.);
  float progress=uProgress;
  vec3 ro=vec3(sin(progress*3.8)*.34,sin(progress*5.2)*.16,-4.5+progress*29.);
  vec3 rd=normalize(vec3(uv.x+sin(progress*5.)*.04,uv.y+cos(progress*4.)*.025,1.27));
  float t=.05, glow=0., hitId=0.;
  for(int i=0;i<70;i++){
    vec2 field=scene(ro+rd*t);
    if(field.x<.006){hitId=field.y;break;}
    float haze=field.y==2.? .010: field.y==3.? .0045: .003;
    glow+=haze/(.045+field.x*field.x)*(.025+1./(1.+t*.04));
    t+=max(.026,field.x*.82);
    if(t>47.)break;
  }
  float vignette=1.-smoothstep(.24,1.23,length(uv));
  vec3 color=mix(vec3(.007,.018,.020),vec3(.021,.060,.052),vignette*.6);
  vec2 stars=uv*vec2(95.,70.)+vec2(progress*1.6,.0);
  float star=step(.9972,hash(floor(stars)))*pow(1.-length(fract(stars)-.5)*1.35,3.);
  color+=vec3(.31,.54,.49)*star*.32;
  float depthLines=sin((uv.x+sin(uv.y*4.)*.04)*18.+progress*6.);
  color+=vec3(.01,.05,.039)*max(depthLines,0.)*.05*vignette;
  if(hitId>0.){
    vec3 p=ro+rd*t;
    vec3 n=normalAt(p);
    vec3 key=normalize(vec3(-.5,.8,-.3));
    float diffuse=max(dot(n,key),0.);
    float spec=pow(max(dot(reflect(-key,n),-rd),0.),36.);
    float rim=pow(1.-abs(dot(n,-rd)),2.);
    vec3 base=hitId==2.?vec3(.12,.55,.36):hitId==3.?vec3(.045,.29,.23):hitId==5.?vec3(.39,.58,.53):vec3(.20,.34,.32);
    vec3 shaded=base*(.23+diffuse*.72)+vec3(.55,.73,.66)*spec*.62+vec3(.10,.54,.37)*rim*.38;
    float fog=exp(-t*.027);
    color=mix(color,shaded,fog);
  }
  color+=vec3(.018,.22,.135)*min(glow,1.8);
  float gatewayHalo=exp(-abs(ro.z-9.7)*.24)*exp(-length(uv)*1.8);
  color+=vec3(.018,.15,.095)*gatewayHalo*.16;
  outColor=vec4(pow(max(color,vec3(0.)),vec3(.84)),1.);
}`

export class CameraJourney implements MotionEngine {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private quad: WebGLBuffer
  private width=1
  private height=1
  private current=0
  private target=0
  constructor(gl: WebGL2RenderingContext){
    this.gl=gl
    this.program=shaderProgram(gl,FULLSCREEN_VERTEX,SCENE)
    this.quad=fullscreenQuad(gl)
  }
  resize(width:number,height:number){this.width=width;this.height=height}
  setProgress(value:number){this.target=clamp(value)}
  frame(dt:number,elapsed:number){
    this.current=dt>0?this.current+(this.target-this.current)*(1-Math.exp(-dt*5.5)):this.target
    const gl=this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER,null)
    gl.viewport(0,0,this.width,this.height)
    gl.useProgram(this.program)
    gl.uniform2f(gl.getUniformLocation(this.program,'uResolution'),this.width,this.height)
    gl.uniform1f(gl.getUniformLocation(this.program,'uProgress'),this.current)
    gl.uniform1f(gl.getUniformLocation(this.program,'uTime'),elapsed)
    drawFullscreen(gl,this.program,this.quad)
  }
  reset(){this.current=0;this.target=0}
  step(){this.target=clamp(this.target+.25)}
  dispose(){this.gl.deleteBuffer(this.quad);this.gl.deleteProgram(this.program)}
}
