import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '../router'
import { clamp, fitCanvas, type MotionEngine } from './gpu'
import { FluidField } from './fluid'
import { CameraJourney } from './journey'
import { PacketRenderer } from './packets'
import { scenarioById, scenarios } from './packetFixtures'
import './motionLab.css'

type Experiment = 'fluid' | 'journey' | 'packets'
const experiments: {id: Experiment; number: string; name: string; subtitle: string}[] = [
  {id:'fluid',number:'01',name:'Fluid field',subtitle:'Pointer force / mineral surface'},
  {id:'journey',number:'02',name:'Camera journey',subtitle:'Scroll / spatial sequence'},
  {id:'packets',number:'03',name:'Semantic packets',subtitle:'Decision / evidence fixture'},
]
const chapters = [
  {tag:'EXTERIOR NETWORK',title:'Signals in open space',detail:'An exposed field of requests and routes.'},
  {tag:'GATEWAY BOUNDARY',title:'Cross the policy plane',detail:'Perspective tightens as the camera approaches the threshold.'},
  {tag:'INTERNAL DATA FLOW',title:'Inside the conduit',detail:'Motion follows the protected path through the system.'},
  {tag:'SERVICE NETWORK',title:'Arrive at the services',detail:'The network resolves into a structured destination.'},
]

export default function MotionLab() {
  const [experiment,setExperiment] = useState<Experiment>('fluid')
  const [playing,setPlaying] = useState(true)
  const [reduced,setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [showFps,setShowFps] = useState(false)
  const [fps,setFps] = useState(0)
  const [scenario,setScenario] = useState('mixed')
  const [progress,setProgress] = useState(0)
  const [selectedId,setSelectedId] = useState<string|null>(null)
  const [unavailable,setUnavailable] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement|null>(null)
  const previewRef = useRef<HTMLDivElement|null>(null)
  const engineRef = useRef<MotionEngine|null>(null)
  const wakeRef = useRef<((pulse?: boolean)=>void)|null>(null)
  const playingRef = useRef(playing)
  const reducedRef = useRef(reduced)
  const showFpsRef = useRef(showFps)
  const pointerRef = useRef<{x:number;y:number}|null>(null)

  useEffect(()=>{playingRef.current=playing;wakeRef.current?.()},[playing])
  useEffect(()=>{reducedRef.current=reduced;wakeRef.current?.()},[reduced])
  useEffect(()=>{showFpsRef.current=showFps; if(!showFps)setFps(0)},[showFps])
  useEffect(()=>{engineRef.current?.setScenario?.(scenario);wakeRef.current?.()},[scenario])
  useEffect(()=>{engineRef.current?.setProgress?.(progress);wakeRef.current?.()},[progress])

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!canvas)return
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'})
    if(!gl){setUnavailable(true);return}
    let disposed=false, lost=false, frame=0, previous=0, elapsed=0, frameCount=0, fpsAt=0, pulse=0
    let engine:MotionEngine|null=null
    const create=()=>{
      try{
        engine=experiment==='fluid'?new FluidField(gl):experiment==='journey'?new CameraJourney(gl):new PacketRenderer(gl)
        engineRef.current=engine
        engine.setScenario?.(scenario)
        engine.setProgress?.(progress)
        setUnavailable(false)
      }catch(error){
        console.error('Motion Lab WebGL initialization failed',error)
        engine?.dispose();engine=null;engineRef.current=null;setUnavailable(true)
      }
    }
    const resize=()=>{
      if(!engine||lost)return
      const {width,height}=fitCanvas(canvas,experiment==='journey'?1.2:1.5)
      engine.resize(width,height)
      wake()
    }
    const tick=(now:number)=>{
      frame=0
      if(disposed||lost||!engine||document.hidden)return
      const running=playingRef.current&&!reducedRef.current
      const dt=running&&previous?Math.min((now-previous)/1000,.05):pulse
      pulse=0;previous=now
      if(dt>0)elapsed+=dt
      engine.frame(dt,elapsed)
      frameCount++
      if(showFpsRef.current){
        if(!fpsAt)fpsAt=now
        if(now-fpsAt>=1000){setFps(Math.round(frameCount*1000/(now-fpsAt)));frameCount=0;fpsAt=now}
      }else{frameCount=0;fpsAt=0}
      if(running)frame=requestAnimationFrame(tick)
    }
    const wake=(forcePulse=false)=>{
      if(forcePulse)pulse=1/60
      if(!frame&&!disposed&&!lost&&!document.hidden)frame=requestAnimationFrame(tick)
    }
    const visibility=()=>{previous=0;if(!document.hidden)wake()}
    const contextLost=(event:Event)=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;engineRef.current=null;setUnavailable(true)}
    const contextRestored=()=>{lost=false;engine=null;create();resize()}
    const observer=new ResizeObserver(resize)
    create()
    observer.observe(canvas)
    canvas.addEventListener('webglcontextlost',contextLost)
    canvas.addEventListener('webglcontextrestored',contextRestored)
    document.addEventListener('visibilitychange',visibility)
    wakeRef.current=wake
    resize()
    return()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect()
      document.removeEventListener('visibilitychange',visibility)
      canvas.removeEventListener('webglcontextlost',contextLost)
      canvas.removeEventListener('webglcontextrestored',contextRestored)
      engine?.dispose();engineRef.current=null;wakeRef.current=null
    }
    // Only the selected engine owns WebGL resources and a frame loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[experiment])

  useEffect(()=>{
    if(experiment!=='journey')return
    const element=previewRef.current
    if(!element)return
    const wheel=(event:WheelEvent)=>{event.preventDefault();setProgress(value=>clamp(value+event.deltaY*.00075))}
    element.addEventListener('wheel',wheel,{passive:false})
    return()=>element.removeEventListener('wheel',wheel)
  },[experiment])

  const point=(event:React.PointerEvent<HTMLCanvasElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect()
    return {x:clamp((event.clientX-rect.left)/rect.width),y:clamp((event.clientY-rect.top)/rect.height)}
  }
  const move=(event:React.PointerEvent<HTMLCanvasElement>)=>{
    const next=point(event),prior=pointerRef.current
    if(experiment==='fluid'){
      engineRef.current?.pointer?.(next.x,next.y,prior?next.x-prior.x:0,prior?next.y-prior.y:0,event.buttons>0)
      wakeRef.current?.(reducedRef.current)
    }else if(experiment==='journey'&&event.buttons>0&&prior){
      setProgress(value=>clamp(value+(prior.y-next.y)*.8))
    }
    pointerRef.current=next
  }
  const click=(event:React.MouseEvent<HTMLCanvasElement>)=>{
    if(experiment!=='packets')return
    const rect=event.currentTarget.getBoundingClientRect()
    const id=engineRef.current?.pick?.((event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height)||null
    setSelectedId(id)
  }
  const replay=()=>{
    engineRef.current?.reset()
    if(experiment==='journey')setProgress(0)
    setSelectedId(null)
    setPlaying(true)
    wakeRef.current?.()
  }
  const step=()=>{setPlaying(false);engineRef.current?.step?.();if(experiment==='journey')setProgress(value=>clamp(value+.25));wakeRef.current?.()}
  const fullscreen=()=>{const element=previewRef.current;if(!element)return; if(document.fullscreenElement)void document.exitFullscreen();else void element.requestFullscreen()}
  const chosenScenario=scenarioById(scenario)
  const selected=useMemo(()=>chosenScenario.events.find(event=>event.id===selectedId)||null,[chosenScenario,selectedId])
  const chapter=chapters[Math.min(3,Math.floor(progress*4))]

  return <main id="main" className="ml-root">
    <header className="ml-header">
      <div className="ml-brand"><span className="ml-glyph" aria-hidden="true">◈</span><div><strong>HYPERION</strong><small>IMMERSIVE MOTION LAB / DEV ONLY</small></div></div>
      <Link href="/" className="ml-exit">Return to application <span aria-hidden="true">↗</span></Link>
    </header>
    <section className="ml-intro" aria-label="Motion Lab introduction">
      <div><span className="ml-kicker">VISUAL SYSTEMS / 001—003</span><h1>Motion <em>Lab.</em></h1></div>
      <p>Three isolated experiments. Local demonstration fixtures only. Nothing on this page changes the gateway or dashboard.</p>
    </section>
    <nav className="ml-selectors" aria-label="Motion experiments">
      {experiments.map(item=><button key={item.id} type="button" className={`ml-selector ${experiment===item.id?'is-active':''}`} aria-pressed={experiment===item.id} onClick={()=>{setExperiment(item.id);setSelectedId(null);setPlaying(true);pointerRef.current=null}}><span>{item.number} / EXPERIMENT</span><strong>{item.name}</strong><small>{item.subtitle}</small></button>)}
    </nav>
    <section ref={previewRef} className={`ml-preview ml-preview-${experiment}`} aria-label={`${experiment} live preview`}>
      <canvas ref={canvasRef} className="ml-canvas" aria-label={`${experiment} WebGL experiment`} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);pointerRef.current=point(event)}} onPointerMove={move} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);const p=point(event);engineRef.current?.pointer?.(p.x,p.y,0,0,false);pointerRef.current=null}} onPointerLeave={()=>{engineRef.current?.pointer?.(0,0,0,0,false);pointerRef.current=null}} onClick={click}/>
      <div className="ml-preview-top"><span>HYPERION / MOTION PROTOTYPE</span><span>0{experiments.findIndex(item=>item.id===experiment)+1} — 03</span></div>
      {experiment==='fluid'&&<div className="ml-scene-caption"><span>FIELD 01 / GPU ADVECTION</span><h2>Mineral current</h2><p>Move and drag across the surface to sculpt the flow.</p></div>}
      {experiment==='journey'&&<><div className="ml-scene-caption ml-journey-caption" key={chapter.tag}><span>{chapter.tag}</span><h2>{chapter.title}</h2><p>{chapter.detail}</p></div><div className="ml-progress-mark"><span>{String(Math.min(4,Math.floor(progress*4)+1)).padStart(2,'0')}</span><i/><span>04</span></div></>}
      {experiment==='packets'&&<><div className="ml-flow-labels" aria-hidden="true"><span>INGRESS</span><span>POLICY BOUNDARY</span><span>SERVICE FABRIC</span></div><div className="ml-packet-legend"><span><i className="allow"/>ALLOW</span><span><i className="flag"/>FLAG</span><span><i className="block"/>BLOCK</span></div>{selected&&<aside className="ml-packet-inspector" aria-label="Selected packet metadata"><button type="button" onClick={()=>setSelectedId(null)} aria-label="Close packet details">×</button><span>DEMO FIXTURE / {selected.id}</span><strong className={`decision-${selected.decision.toLowerCase()}`}>{selected.decision} · HTTP {selected.status}</strong><code>{selected.method} {selected.route}</code><p>{selected.reason}</p><small>Client {selected.client} · {selected.latencyMs===null?'No upstream response':`${selected.latencyMs} ms synthetic latency`}</small></aside>}</>}
      {unavailable&&<div className="ml-fallback" role="status"><strong>WebGL is unavailable.</strong><p>Try a browser with WebGL2 enabled. The existing application is unaffected.</p></div>}
      {showFps&&<span className="ml-fps" aria-live="off">{fps} FPS</span>}
    </section>
    <div className="ml-controls" aria-label="Motion controls">
      <div className="ml-control-primary"><button type="button" onClick={replay}>↺ <span>Replay</span></button><button type="button" onClick={()=>setPlaying(value=>!value)} aria-pressed={!playing}>{playing?'Ⅱ':'▷'} <span>{playing?'Pause':'Resume'}</span></button>{experiment==='packets'&&<button type="button" onClick={step}>→ <span>Step</span></button>}</div>
      {experiment==='journey'&&<label className="ml-timeline"><span>SCROLL / DRAG TO TRAVEL</span><input aria-label="Journey progress" type="range" min="0" max="100" value={Math.round(progress*100)} onChange={event=>setProgress(Number(event.target.value)/100)}/><output>{String(Math.round(progress*100)).padStart(2,'0')}%</output></label>}
      {experiment==='packets'&&<label className="ml-scenario"><span>SCENARIO</span><select aria-label="Packet scenario" value={scenario} onChange={event=>{setScenario(event.target.value);setSelectedId(null);setPlaying(true)}}>{scenarios.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select><small className="ml-scenario-note">{chosenScenario.note}</small></label>}
      <div className="ml-control-secondary"><label><input type="checkbox" checked={reduced} onChange={event=>setReduced(event.target.checked)}/> Reduced motion</label><label><input type="checkbox" checked={showFps} onChange={event=>setShowFps(event.target.checked)}/> FPS</label><button type="button" onClick={fullscreen}>⛶ <span>Fullscreen</span></button></div>
    </div>
    <footer className="ml-footer"><span>PROTOTYPE GRAPHICS — NOT LIVE GATEWAY TELEMETRY</span><span>ONE ACTIVE CANVAS · LOCAL ONLY</span></footer>
  </main>
}
