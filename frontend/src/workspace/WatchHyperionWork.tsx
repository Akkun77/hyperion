import { useEffect, useRef, useState } from 'react'
import { Link } from '../router'
import { DemoResult, productRequest } from './productApi'

const scenarios=[['normal','Normal request'],['scraping','Scraping'],['token','Token misuse'],['bola','BOLA'],['shadow','Shadow discovery']]
export default function WatchHyperionWork(){
 const [scenario,setScenario]=useState('normal');const [authorized,setAuthorized]=useState(false)
 const [result,setResult]=useState<DemoResult|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('')
 const [stage,setStage]=useState(0);const [playing,setPlaying]=useState(false)
 const emittedStage=useRef('')
 useEffect(()=>{
  if(!result)return
  const selected=result.flow.stages[stage]
  if(!selected)return
  const key=`${result.run_id}:${selected.id}`
  if(emittedStage.current!==key){emittedStage.current=key;window.dispatchEvent(new CustomEvent('hyperion-demo-stage',{detail:{signals:[{kind:stage===4&&result.findings.length?'finding':'traffic',severity:result.findings[0]?.severity}],runId:result.run_id,stage:selected.id}}))}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.visualMotion==='reduced'
  if(!playing||reduced||stage>=result.flow.stages.length-1){setPlaying(false);return}
  const timer=window.setTimeout(()=>setStage(current=>current+1),360)
  return()=>window.clearTimeout(timer)
 },[result,stage,playing])
 const run=async()=>{
  setBusy(true);setError('');setResult(null);setPlaying(false)
  try{const response=await productRequest<DemoResult>('demo/run',undefined,{scenario,authorized});setStage(0);setResult(response);setPlaying(true)}
  catch(reason){setError(reason instanceof Error?reason.message:'Controlled execution unavailable.')}
  finally{setBusy(false)}
 }
 const selected=result?.flow.stages[stage]
 return <section className="watch-experience" aria-label="Watch Hyperion work">
  <div className="watch-introduction"><span className="eyebrow">EXPLICIT EXECUTION / REAL PERSISTED EVIDENCE</span><h1>Watch Hyperion<br/>work.</h1><p>Send a controlled request through the actual FastAPI capture and security engine. Then explore its recorded seven-stage execution. Ambient loop motion alone is never live telemetry.</p><Link className="text-link" href="/command-center/connect">Connect your authorized API ↗</Link></div>
  <div className="scenario-controls"><div className="workflow-modes" aria-label="Controlled scenario">{scenarios.map(([value,label])=><button key={value} aria-pressed={scenario===value} disabled={busy} onClick={()=>{setScenario(value);setResult(null);setPlaying(false);setError('')}}>{label}</button>)}</div><p>Fixed local targets only. This appends {scenario==='scraping'?'16':scenario==='token'?'3':'1'} clearly controlled request{scenario==='scraping'||scenario==='token'?'s':''}; historical data is retained. Shadow discovery observes the built-in undocumented debug route, which may already be known.</p><label className="workflow-consent"><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/>I am authorized to run this controlled local demonstration.</label><button className="button primary" disabled={busy||!authorized} onClick={run}>{busy?'Executing real backend requests…':'Run controlled scenario ↗'}</button>{busy&&<p role="status">Awaiting actual backend results. No execution stage is confirmed yet.</p>}{error&&<p role="alert" className="error-text">{error}</p>}</div>
  {result&&<div className="confirmed-run workflow-reveal" data-run-id={result.run_id}><div className="panel-heading"><div><span className="eyebrow">COMPLETED CONTROLLED LOCAL EXECUTION</span><h2>{result.detector_result}</h2><p>{result.request_count} persisted requests · {result.findings.length} generated findings · run {result.run_id.slice(0,8)}</p></div><button className="filter-reset" onClick={()=>{setStage(0);setPlaying(true)}} disabled={playing}>Replay recorded stages</button></div><p className="recorded-label">{result.presentation} Replay never sends additional requests.</p>
   <div className="confirmed-stages" aria-label="Confirmed execution stages">{result.flow.stages.map((item,index)=><button key={item.id} className={index===stage?'active':''} aria-current={index===stage?'step':undefined} onClick={()=>{setPlaying(false);setStage(index)}}><small>0{item.step} · {item.status}</small><span>{item.name}</span></button>)}</div>
   {selected&&<section key={`${result.run_id}:${selected.id}`} className="demo-stage-detail workflow-reveal" aria-label="Selected confirmed stage"><span className="eyebrow">RECORDED STAGE 0{selected.step}</span><h2>{selected.name}</h2><p>{selected.summary}</p><dl>{Object.entries(selected.meta).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{typeof value==='object'?JSON.stringify(value):String(value??'Not available')}</dd></div>)}</dl></section>}
   <div className="demo-request"><h3>Selected persisted request</h3><code>#{result.selected_request.id} · {result.selected_request.method} {result.selected_request.endpoint}</code><p>{result.selected_request.timestamp} · HTTP {result.selected_request.status_code}</p><div className="workflow-actions"><Link className="text-link" href={`/command-center/investigation?event=${result.selected_request.id}`}>Inspect real request evidence ↗</Link>{result.flow.selected_alert_id&&<Link className="text-link" href={`/command-center/investigation?alert=${result.flow.selected_alert_id}`}>Inspect generated finding ↗</Link>}<Link className="text-link" href={`/command-center/flow?event=${result.selected_request.id}`}>Open full execution flow ↗</Link></div></div>
  </div>}
 </section>
}
