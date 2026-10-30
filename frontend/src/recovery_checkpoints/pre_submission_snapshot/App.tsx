import { lazy, Suspense, useEffect } from 'react'
import ArrivalPage from './visual/arrival/ArrivalPage'
import './theme/tokens.css'
import './workspace/design-foundation.css'
import './workspace/unified-workspace.css'
import './workspace/product-workflows.css'
import { Link, usePath } from './router'

const CommandCenter = lazy(() => import('./pages/CommandCenter'))
const Watch = lazy(() => import('./pages/Watch'))
const UnseenHome = lazy(() => import('./vnext/home/UnseenHome'))
const NetworkingExperience = lazy(() => import('./pages/NetworkingExperience'))
const motionLabEnabled = import.meta.env.DEV || import.meta.env.MODE === 'motion-lab'
const MotionLab = motionLabEnabled ? lazy(() => import('./motion-lab/MotionLab')) : null

export default function App() {
  const path = usePath()
  const operational = path.startsWith('/command-center')
  const pathname = path.split('?')[0]
  const isVNext = pathname === '/home-vnext' || pathname === '/'
  const isExperience = pathname === '/experience'
  const known = operational || pathname === '/' || pathname === '/experience' || pathname === '/platform' || pathname === '/watch' || pathname === '/home-vnext' || pathname === '/legacy-home'
  useEffect(() => {
    document.title = (pathname === '/home-vnext' || pathname === '/')
      ? 'HYPERION — Every Request Leaves a Trace'
      : pathname === '/experience'
        ? 'Interactive Experience — HYPERION'
        : pathname === '/motion-lab' && MotionLab
          ? 'Motion Lab — HYPERION'
          : operational
            ? 'Command Center — HYPERION'
            : pathname === '/watch'
              ? 'Watch Hyperion Work — HYPERION'
              : 'HYPERION — Beyond Visibility'
    document.documentElement.dataset.route = isVNext
      ? 'home-vnext'
      : isExperience
        ? 'experience'
        : pathname === '/motion-lab' && MotionLab
          ? 'motion-lab'
          : pathname === '/watch'
            ? 'watch'
            : operational
              ? 'command-center'
              : 'home'
  }, [operational, pathname, isVNext, isExperience])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => { document.documentElement.dataset.visualMotion = preference.matches ? 'reduced' : 'full' }
    sync()
    preference.addEventListener('change', sync)
    return () => preference.removeEventListener('change', sync)
  }, [])
  useEffect(() => {
    const visibility = () => { document.documentElement.dataset.pageHidden = String(document.hidden) }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])

  if (pathname === '/motion-lab' && MotionLab) return <Suspense fallback={<main id="main">Opening Motion Lab…</main>}><MotionLab /></Suspense>

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="application-surface">
    {known ? isVNext
      ? <Suspense fallback={<main id="main" className="workspace-loading">Opening The Unseen…</main>}><UnseenHome /></Suspense>
      : isExperience
        ? <Suspense fallback={<main id="main" className="workspace-loading">Opening Interactive Experience…</main>}><NetworkingExperience /></Suspense>
        : operational
          ? <Suspense fallback={<main id="main" className="workspace-loading">Opening command center…</main>}><CommandCenter path={path} /></Suspense>
          : pathname === '/watch' ? <Suspense fallback={<main id="main" className="workspace-loading">Opening controlled experience…</main>}><Watch/></Suspense> : <ArrivalPage platform={pathname === '/platform'} />
      : <main id="main" className="not-found"><span className="eyebrow">404 / ROUTE NOT FOUND</span><h1>Off the map.</h1><p>This page is outside the Hyperion platform.</p><Link className="button primary" href="/">Return to Hyperion ↗</Link></main>}
    </div>
  </>
}
