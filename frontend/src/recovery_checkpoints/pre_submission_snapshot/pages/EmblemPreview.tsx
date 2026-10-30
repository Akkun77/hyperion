import { useEffect, useRef, useState } from 'react'
import { Link } from '../router'
import { createEnvironment } from '../graphics/environment'
import { createSentinelPreview } from '../graphics/sentinelRenderer'
import './emblem-preview.css'

function Sculpture({variant,stationary,small=false}:{variant:'knot'|'sentinel';stationary:boolean;small?:boolean}){
  const ref=useRef<HTMLCanvasElement>(null), [mode,setMode]=useState('initializing')
  useEffect(()=>variant==='knot'?createEnvironment(ref.current!,setMode,stationary,true):createSentinelPreview(ref.current!,stationary,setMode),[variant,stationary])
  return <div className={`emblem-preview-surface ${small?'emblem-preview-small':''}`} data-renderer={mode}>
    <canvas ref={ref} aria-label={`${variant==='knot'?'Existing knot':'Sentinel Core'} ${small?'small-scale':'hero-scale'} preview`} />
    {mode!=='webgl'&&<p role="status">{mode==='initializing'?'Initializing geometry…':'WebGL unavailable — no substitute emblem is shown.'}</p>}
  </div>
}
export default function EmblemPreview(){
  const [stationary,setStationary]=useState(true)
  return <main id="main" className="emblem-comparison">
    <header><Link href="/">← Back to HYPERION</Link><span className="eyebrow">ISOLATED DESIGN REVIEW / NOT THE GLOBAL LOGO</span>
      <h1>A new silhouette. Your approval first.</h1>
      <p>Compare the existing knot with three separate curved graphite blades around a triangular aperture. No backend requests or demonstration playback.</p>
      <div className="emblem-preview-controls" role="group" aria-label="Emblem motion">
        <button type="button" aria-pressed={stationary} onClick={()=>setStationary(true)}>Stationary</button>
        <button type="button" aria-pressed={!stationary} onClick={()=>setStationary(false)}>Slow movement</button>
      </div>
      <small>Reduced-motion preferences keep both sculptures stationary.</small>
    </header>
    <div className="emblem-comparison-grid">
      <article><h2>A / Existing knot</h2><p>Current homepage renderer · continuous tubular centerline</p><Sculpture variant="knot" stationary={stationary}/>
        <div className="emblem-small-review"><Sculpture variant="knot" stationary={stationary} small/><span>64px silhouette check</span></div>
      </article>
      <article><h2>B / Sentinel Core</h2><p>New solid geometry · three beveled blades · inlaid emerald channels</p><Sculpture variant="sentinel" stationary={stationary}/>
        <div className="emblem-small-review"><Sculpture variant="sentinel" stationary={stationary} small/><span>64px silhouette check</span></div>
      </article>
    </div>
    <footer>Preview only. Homepage emblem, brand mark and favicon have not been replaced.</footer>
  </main>
}
