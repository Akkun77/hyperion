import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import AnimatedEnvironment from './components/AnimatedEnvironment'
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
    if (pathname !== '/' && pathname !== '/platform') return false
    try { return !sessionStorage.getItem('hyperion-initialized') } catch { return true }
  })
  const finishIntro = useCallback(() => {setIntro(false);try{sessionStorage.setItem('hyperion-initialized','true')}catch{/* optional */}}, [])
  useEffect(() => {
    document.title = operational ? 'Command Center — HYPERION' : pathname === '/watch' ? 'Watch Hyperion Work — HYPERION' : 'HYPERION — Beyond Visibility'
    document.documentElement.dataset.route = pathname === '/watch' ? 'watch' : operational ? 'command-center' : 'home'
  }, [operational, pathname])
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
    {intro && <BrandReveal onComplete={finishIntro} />}
    <div className="application-surface" {...(intro ? {inert: ''} : {})} aria-hidden={intro || undefined}>
    {known ? operational
      ? <Suspense fallback={<main id="main" className="workspace-loading">Opening command center…</main>}><CommandCenter path={path} /></Suspense>
      : pathname === '/watch' ? <Suspense fallback={<main id="main" className="workspace-loading">Opening controlled experience…</main>}><Watch/></Suspense> : <Landing platform={pathname === '/platform'} visualMode={visualMode} onVisualMode={setVisualMode} />
      : <main id="main" className="not-found"><span className="eyebrow">404 / ROUTE NOT FOUND</span><h1>Off the map.</h1><p>This page is outside the Hyperion platform.</p><Link className="button primary" href="/">Return to Hyperion ↗</Link></main>}
    </div>
  </>
}
