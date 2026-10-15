import { ReactNode, useEffect, useState } from 'react'
// Preserve the outgoing view briefly; cancel stale switches on rapid navigation.
export default function RouteView({ section, children }: {section:string; children:(section:string)=>ReactNode}) {
  const [shown,setShown] = useState(section)
  const [leaving,setLeaving] = useState(false)
  useEffect(()=>{
    if (section===shown) {setLeaving(false);return}
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.visualMotion==='reduced') {setShown(section);setLeaving(false);return}
    setLeaving(true)
    const timer=window.setTimeout(()=>{setShown(section);setLeaving(false)},120)
    return ()=>window.clearTimeout(timer)
  },[section,shown])
  return <div className={`route-stage ${leaving?'route-leaving':''}`} aria-busy={leaving}><div className="route-content" key={shown}>{children(shown)}</div></div>
}
