import { loopEmblemPath } from '../graphics/loop'
import { Link } from '../router'
import { pulseTone, SignalState } from './liveSignal'
const path = loopEmblemPath()
export default function SignalObservatory({ state, disconnected }: {state:SignalState;disconnected:boolean}) {
  return <section className={`live-signal ${disconnected ? 'signal-offline' : ''}`} aria-labelledby="signal-title">
    <div className="signal-intro"><span className="eyebrow">OBSERVED / NOT STREAMED</span><h2 id="signal-title">Live Signal</h2><p>{disconnected ? 'Connection lost. Last observations retained; event pulses paused.' : state.note}</p><small>5-second polling · local API environment, including controlled demo records. Per-record simulation provenance is not available.</small></div>
    <div className="signal-map" aria-hidden="true" data-revision={state.revision} data-tone={pulseTone(state.batch)}><svg viewBox="0 0 64 64"><path d={path} className="signal-loop"/>{!disconnected && state.batch.length>0 && <path key={state.revision} d={path} pathLength="100" className={`signal-observation signal-tone-${pulseTone(state.batch)}`}/>}</svg><span>{disconnected ? 'STALE' : state.batch.length ? 'OBSERVED SIGNAL' : 'BASELINE / IDLE'}</span></div>
    <div className="signal-traces" aria-label="Inspectable signal traces">{state.recent.length ? state.recent.slice(0,6).map(row=><Link key={row.key} href={row.href} className={`signal-trace trace-${row.kind}`}><span>{row.historical ? 'BASELINE' : row.kind.toUpperCase()}</span><strong>{row.label}</strong><small>{row.detail} ↗</small></Link>) : <p>No observations yet. Monitored API activity will appear here.</p>}</div>
    <p className="signal-footnote">The sculpture’s continuous emerald motion is ambient. Event accents occur only for identifiable new observations; baseline and reconnect catch-up never pulse. Up to 6 of 18 session traces shown.</p>
  </section>
}
