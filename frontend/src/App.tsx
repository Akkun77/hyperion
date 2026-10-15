import { lazy, Suspense, useEffect, useState } from 'react'
import AnimatedEnvironment from './components/AnimatedEnvironment'
import { Mark } from './components/Brand'
import Landing from './pages/Landing'
import './workspace/design-foundation.css'
import './workspace/unified-workspace.css'
import './workspace/product-workflows.css'
import { Link, usePath } from './router'

import BrandReveal from './components/BrandReveal'

const CommandCenter = lazy(() => import('./pages/CommandCenter'))
const Watch = lazy(() => import('./pages/Watch'))

export default function App() {
  const path = usePath()
  const operational = path.startsWith('/command-center')
  const pathname = path.split('?')[0]
  const known = operational || pathname === '/' || pathname === '/platform' || pathname === '/watch'
  const [visualMode, setVisualMode] = useState('full')
  const [intro, setIntro] = useState(() => {
    try { return !sessionStorage.getItem('hyperion-initialized') } catch { return true }
  })
  const finishIntro = () => {setIntro(false);try{sessionStorage.setItem('hyperion-initialized','true')}catch{/* optional */}}
  useEffect(() => {
    const timer = window.setTimeout(finishIntro, window.matchMedia('(prefers-reduced-motion: reduce)').matches || operational ? 0 : 2600)
    const skip=(event:KeyboardEvent)=>{if(event.key==='Escape')finishIntro()}
    window.addEventListener('keydown',skip);window.addEventListener('pointerdown',finishIntro,{once:true})
    return () => {window.clearTimeout(timer);window.removeEventListener('keydown',skip);window.removeEventListener('pointerdown',finishIntro)}
  }, [])
  useEffect(() => {
    document.title = operational ? 'Command Center — HYPERION' : 'HYPERION — Beyond Visibility'
  }, [operational])
  useEffect(() => {
    document.documentElement.dataset.visualMotion = visualMode === 'still' ? 'reduced' : 'full'
  }, [visualMode])
  useEffect(() => {
    const visibility = () => { document.documentElement.dataset.pageHidden = String(document.hidden) }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <AnimatedEnvironment subdued={operational} visualMode={visualMode} />
    {intro && (
      <>
        <div className="initialization" aria-hidden="true" style={{ display: 'none' }}>
          <Mark animated />
          <span>HYPERION</span>
          <small>API SECURITY SYSTEMS</small>
        </div>
        <BrandReveal onComplete={finishIntro} />
      </>
    )}
    {known ? operational
      ? <Suspense fallback={<main id="main" className="workspace-loading">Opening command center…</main>}><CommandCenter path={path} /></Suspense>
      : pathname === '/watch' ? <Suspense fallback={<main id="main" className="workspace-loading">Opening controlled experience…</main>}><Watch/></Suspense> : <Landing platform={pathname === '/platform'} visualMode={visualMode} onVisualMode={setVisualMode} />
      : <main id="main" className="not-found"><span className="eyebrow">404 / ROUTE NOT FOUND</span><h1>Off the map.</h1><p>This page is outside the Hyperion platform.</p><Link className="button primary" href="/">Return to Hyperion ↗</Link></main>}
  </>
}
