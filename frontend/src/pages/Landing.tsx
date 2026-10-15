import { CSSProperties, useEffect } from 'react'
import Brand, { Mark } from '../components/Brand'
import { Link } from '../router'

const chapters = [
  { number: '01', label: 'DISCOVERY', title: 'See what exists.', text: 'Your attack surface doesn’t end at your documentation. Discover endpoints from observed traffic and uncover the APIs hiding in plain sight.', detail: 'Observed routes are normalized and compared with the managed OpenAPI catalog. Undocumented routes surface as shadow APIs.', kind: 'discovery' },
  { number: '02', label: 'OBSERVABILITY', title: 'Observe behavior.', text: 'A request is a signal. A pattern tells a story. Follow traffic activity across endpoints, identities and origins.', detail: 'Timestamped traffic records capture the request method, endpoint, caller, authentication signal and actual response status.', kind: 'traffic' },
  { number: '03', label: 'DETECTION', title: 'Detect what matters.', text: 'Find the behavior behind the breach. Surface scraping bursts, reused tokens and cross-user resource access.', detail: 'Runtime rules detect high-frequency scraping, token use across multiple IPs and BOLA scenarios in the controlled demo APIs.', kind: 'detection' },
  { number: '04', label: 'RISK INTELLIGENCE', title: 'Understand every risk.', text: 'No unexplained numbers. Turn endpoint exposure into a clear, inspectable score with the reasons behind it.', detail: 'Scores combine shadow status, authentication signals, sensitive-data indicators, request methods and recorded findings. Every contribution is visible.', kind: 'risk' },
  { number: '05', label: 'INVESTIGATION', title: 'Follow the evidence.', text: 'Go from a finding to the request that triggered it. Keep the context. Connect the dots. Make the next decision with clarity.', detail: 'New findings link to persisted traffic IDs. Open a related event to inspect its caller, resource, response status and observation time.', kind: 'evidence' },
]

function Illustration({ kind }: { kind: string }) {
  return <div className={`concept concept-${kind}`} aria-label="Illustrative API security diagram, not live telemetry" role="img">
    <span className="concept-label">SYSTEM CONCEPT / NOT LIVE DATA</span>
    {kind === 'discovery' && <><div className="concept-core"><Mark/><span>GATEWAY</span></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/><span className="concept-node node-a">GET /users</span><span className="concept-node node-b">POST /payments</span><span className="concept-node node-c">? /undocumented</span></>}
    {kind === 'traffic' && <><div className="signal-lines">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</div><div className="signal-caption"><span>REQUEST</span><span>OBSERVE</span><span>RECORD</span></div></>}
    {kind === 'detection' && <div className="detection-stack"><div><i />Rate anomaly<span>SCRAPING</span></div><div><i />IP diversity<span>TOKEN MISUSE</span></div><div><i />Ownership mismatch<span>BOLA</span></div></div>}
    {kind === 'risk' && <><div className="risk-orbit"><span>0—100<small>EXPLAINABLE BY DESIGN</small></span></div><span className="concept-node risk-factor">EXPOSURE + BEHAVIOR</span></>}
    {kind === 'evidence' && <div className="evidence-flow"><span>01<small>FINDING</small></span><i>→</i><span>02<small>TRAFFIC ID</small></span><i>→</i><span>03<small>CONTEXT</small></span></div>}
  </div>
}

export default function Landing({ platform, visualMode, onVisualMode }: { platform: boolean; visualMode: string; onVisualMode: (mode: string) => void }) {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target) } })
    }, { threshold: .12 })
    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return <div className="product-site">
    <header className="site-header">
      <Link href="/" aria-label="Hyperion home"><Brand /></Link>
      <nav aria-label="Primary navigation"><Link href="/platform" aria-current={platform ? 'page' : undefined}>Platform</Link><a href="#capabilities">Capabilities</a><Link href="/command-center" className="nav-entry">Command center <span>↗</span></Link></nav>
    </header>
    <main id="main">
      <section className="hero">
        <div className="hero-copy">
          <Link className="hero-watch-link" href="/watch">Watch Hyperion work <span>↗</span></Link>
          <div className="eyebrow hero-enter"><span className="small-cross">+</span> INTELLIGENCE AT THE API EDGE</div>
          <h1 className="hero-enter">API Security,<br/><span>Beyond</span><br/><em>Visibility.</em></h1>
          <p className="hero-enter">Discover undocumented APIs, detect suspicious traffic, investigate security findings and understand exposure with explainable risk intelligence.</p>
          <div className="hero-actions hero-enter"><Link className="button primary" href="/command-center">Enter command center <span>↗</span></Link><a className="text-link" href="#capabilities">Explore Hyperion <span>↓</span></a></div>
          <div className="hero-note hero-enter"><span className="status-dot"/> PASSIVE DISCOVERY <b>/</b> RUNTIME DETECTION <b>/</b> TRACEABLE EVIDENCE</div>
        </div>
        <div className="sculpture-caption"><span className="crosshair">+</span><div>HYPERION / CORE 001<small>VISIBILITY IS ONLY THE BEGINNING.</small></div></div>
        <div className="hero-foot"><span>DESIGNED FOR THE UNSEEN.</span><a href="#capabilities">SCROLL TO EXPLORE <span>↓</span></a><span>API DISCOVERY & SECURITY</span></div>
      </section>
      <section className="manifesto reveal" id="platform"><div className="eyebrow">THE HYPERION APPROACH</div><h2>Every endpoint.<br/>Every signal.<br/><span>A clearer picture.</span></h2><p>Modern APIs move fast. Security should keep up. Hyperion brings discovery, behavioral detection and investigation into one connected workspace.</p><Link href="/command-center" className="text-link">Explore the workspace ↗</Link></section>
      <div id="capabilities" className="chapters">
        {chapters.map(chapter => <section className="chapter reveal" key={chapter.number} id={chapter.kind}>
          <div className="chapter-number">{chapter.number}<span>/ 05</span></div>
          <div className="chapter-copy"><div className="eyebrow">{chapter.label}</div><h2>{chapter.title}</h2><p>{chapter.text}</p><details><summary>Inside the system <span>+</span></summary><p>{chapter.detail}</p></details></div>
          <Illustration kind={chapter.kind} />
        </section>)}
      </div>
      <section className="workspace-invitation reveal"><div><span className="eyebrow">THE OPERATIONAL LAYER</span><h2>From the big picture.<br/><span>Into the details.</span></h2><p>Your inventory, traffic, findings and evidence. One focused workspace, connected to the actual security engine.</p><Link className="button primary" href="/command-center">Enter command center <span>↗</span></Link></div><div className="workspace-preview" aria-label="Workspace navigation preview"><div className="preview-heading"><Brand compact/><span>SECURITY WORKSPACE</span><span>↗</span></div>{[['01', 'Endpoint inventory', '/command-center/inventory'], ['02', 'Traffic activity', '/command-center/traffic'], ['03', 'Threat findings', '/command-center/alerts'], ['04', 'Risk intelligence', '/command-center/risk']].map(([n, name, href]) => <Link href={href} key={n}><span>{n}</span>{name}<b>↗</b></Link>)}<small>LIVE DATA LOADS WHEN YOU ENTER THE WORKSPACE.</small></div></section>
      <section className="final-statement reveal"><span className="eyebrow">BEYOND THE DOCUMENTED. BEYOND THE EXPECTED.</span><h2>Secure what’s<br/><em>actually there.</em></h2><Link className="text-link" href="/command-center">Open Hyperion ↗</Link></section>
    </main>
    <footer className="site-footer"><Link href="/"><Brand /></Link><span>BUILT FOR CYBERCUP 6.0 <b>CC6–IC07</b></span><label className="visual-preference">VISUAL EXPERIENCE<select aria-label="Visual experience" value={visualMode} onChange={event => onVisualMode(event.target.value)}><option value="full">Full motion</option><option value="still">Reduced motion</option><option value="light">Light visuals</option></select></label><a href="#main">BACK TO TOP ↑</a></footer>
  </div>
}
