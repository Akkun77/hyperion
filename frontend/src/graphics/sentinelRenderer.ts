import { buildSentinelGeometry } from './sentinelGeometry'

export function createSentinelPreview(canvas: HTMLCanvasElement, stationary: boolean, onMode: (mode: string) => void) {
  const gl = canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'})
  if(!gl){onMode('unavailable');return ()=>{}}
  const program=gl.createProgram()!, buffer=gl.createBuffer()!, shaders:WebGLShader[]=[]
  let frame=0, disposed=false, elapsed=0, previous=0, frames=0
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)')
  const sources=[
    [gl.VERTEX_SHADER,`
      precision highp float;
      attribute vec3 aPosition; attribute vec3 aNormal; attribute float aChannel;
      uniform float uTime; uniform float uAspect;
      varying vec3 vNormal; varying vec3 vPosition; varying float vChannel;
      void main(){
        float x=.12+sin(uTime*.3)*.12, y=-.12+sin(uTime*.23)*.26;
        mat3 rx=mat3(1.,0.,0.,0.,cos(x),sin(x),0.,-sin(x),cos(x));
        mat3 ry=mat3(cos(y),0.,-sin(y),0.,1.,0.,sin(y),0.,cos(y));
        mat3 rotation=ry*rx; vec3 p=rotation*aPosition;
        vNormal=rotation*aNormal; vPosition=p; vChannel=aChannel;
        float scale=.55*min(uAspect,1.);
        gl_Position=vec4(p.x*scale/uAspect,p.y*scale,-p.z*.2,1.);
      }`],
    [gl.FRAGMENT_SHADER,`
      precision highp float;
      varying vec3 vNormal; varying vec3 vPosition; varying float vChannel;
      uniform float uTime;
      void main(){
        vec3 n=normalize(vNormal), view=vec3(0.,0.,1.);
        vec3 key=normalize(vec3(-.6,.9,1.2)), fill=normalize(vec3(.9,-.3,.6));
        float diffuse=max(dot(n,key),0.), secondary=max(dot(n,fill),0.);
        float soft=pow(max(dot(n,normalize(key+view)),0.),24.);
        float glint=pow(max(dot(n,normalize(fill+view)),0.),95.);
        float edge=pow(1.-abs(dot(n,view)),3.);
        vec3 graphite=vec3(.035,.043,.047)*(.55+diffuse*1.9+secondary*.7);
        vec3 color=graphite+vec3(.36,.41,.44)*soft*.6+vec3(.7,.78,.79)*glint*.45;
        color+=vec3(.035,.12,.085)*edge;
        vec3 channel=vec3(.08,.65,.38)*(.85+.15*sin(uTime*.6+vPosition.y));
        color=mix(color,channel,vChannel);
        gl_FragColor=vec4(pow(color,vec3(.8)),1.);
      }`]
  ] as const
  const cleanup=()=>{disposed=true;cancelAnimationFrame(frame);shaders.forEach(shader=>gl.deleteShader(shader));gl.deleteBuffer(buffer);gl.deleteProgram(program)}
  try {
    for(const [type,source] of sources){
      const shader=gl.createShader(type)!;shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader)
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Sentinel shader compilation failed')
      gl.attachShader(program,shader)
    }
    gl.linkProgram(program)
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Sentinel shader linking failed')
  } catch(error){cleanup();onMode('unavailable');console.error(error);return ()=>{}}
  const mesh=buildSentinelGeometry()
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW)
  for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aChannel',1,24]] as const){
    const attribute=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,28,offset)
  }
  const time=gl.getUniformLocation(program,'uTime'), aspect=gl.getUniformLocation(program,'uAspect')
  gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0)
  const still=()=>stationary||reduced.matches
  const draw=(now:number)=>{
    if(disposed||document.hidden)return
    if(previous&&!still())elapsed+=Math.min(now-previous,100)/1000
    previous=now
    gl.useProgram(program);gl.uniform1f(time,still()?0:elapsed);gl.uniform1f(aspect,canvas.width/canvas.height)
    gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,mesh.vertices.length/7)
    canvas.dataset.frames=String(++frames);canvas.dataset.motion=still()?'stationary':'moving';canvas.dataset.geometry='sentinel-three-blades'
    if(!still())frame=requestAnimationFrame(draw)
  }
  const resume=()=>{cancelAnimationFrame(frame);previous=0;if(!document.hidden&&!disposed)frame=requestAnimationFrame(draw)}
  const resize=()=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));resume()}
  const lost=(event:Event)=>{event.preventDefault();disposed=true;cancelAnimationFrame(frame);onMode('unavailable')}
  const observer=new ResizeObserver(resize);observer.observe(canvas)
  document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);canvas.addEventListener('webglcontextlost',lost)
  resize();onMode('webgl')
  return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',resume);reduced.removeEventListener('change',resume);canvas.removeEventListener('webglcontextlost',lost);cleanup()}
}
