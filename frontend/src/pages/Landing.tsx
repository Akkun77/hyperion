import { useEffect } from 'react'
import Brand from '../components/Brand'
import { Link } from '../router'
import HomepageDemoPreview from '../components/HomepageDemoPreview'
import ContinuousSecurityStory from '../components/ContinuousSecurityStory'
import './homepage-responsive-safety.css'

export default function Landing({
  platform,
  visualMode,
  onVisualMode
}: {
  platform: boolean
  visualMode: string
  onVisualMode: (mode: string) => void
}) {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="product-site">
      <header className="site-header">
        <Link href="/" aria-label="Hyperion home">
          <Brand />
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/platform" aria-current={platform ? 'page' : undefined}>
            Platform
          </Link>
          <a href="#capabilities">Capabilities</a>
          <Link href="/watch">Watch demo</Link>
          <Link href="/command-center" className="nav-entry">
            Command center <span>↗</span>
          </Link>
        </nav>
      </header>

      <main id="main">
        {/* Cinematic Hero */}
        <section className="hero">
          <div className="hero-copy">
            <Link className="hero-watch-link" href="/watch">
              Watch Hyperion work <span>↗</span>
            </Link>

            <div className="eyebrow hero-enter">
              <span className="small-cross">+</span> INTELLIGENCE AT THE API EDGE
            </div>

            <h1 className="hero-enter">
              API Security,<br />
              <span>Beyond</span><br />
              <em>Visibility.</em>
            </h1>

            <p className="hero-enter">
              Discover undocumented APIs, detect suspicious traffic, investigate security findings and understand exposure with explainable risk intelligence.
            </p>

            <div className="hero-actions hero-enter">
              <Link className="button primary" href="/command-center">
                Enter command center <span>↗</span>
              </Link>
              <Link className="button secondary" href="/watch">
                Watch demonstration <span>↗</span>
              </Link>
            </div>

            <div className="hero-note hero-enter">
              <span className="status-dot" /> PASSIVE DISCOVERY <b>/</b> RUNTIME DETECTION <b>/</b> TRACEABLE EVIDENCE
            </div>
          </div>

          <div className="sculpture-caption">
            <span className="crosshair">+</span>
            <div>
              HYPERION / LIVING SECURITY CORE
              <small>SEE THE REQUEST. UNDERSTAND THE RISK. FOLLOW THE EVIDENCE.</small>
            </div>
          </div>

          <div className="hero-foot">
            <span>DESIGNED FOR THE UNSEEN.</span>
            <a href="#demo-preview">
              INTERACTIVE DEMO PREVIEW <span>↓</span>
            </a>
            <span>API DISCOVERY &amp; SECURITY</span>
          </div>
        </section>

        {/* High-Impact Homepage Demonstration Centerpiece */}
        <div id="demo-preview">
          <HomepageDemoPreview />
        </div>

        {/* Manifesto Section */}
        <section className="manifesto reveal" id="platform">
          <div className="eyebrow">THE HYPERION APPROACH</div>
          <h2>
            Every endpoint.<br />
            Every signal.<br />
            <span>A clearer picture.</span>
          </h2>
          <p>
            Modern APIs move fast. Security should keep up. Hyperion brings passive discovery, behavioral detection, and forensic evidence binding into one connected workspace.
          </p>
          <Link href="/command-center" className="text-link">
            Explore the workspace ↗
          </Link>
        </section>

        {/* One Coherent Visual Story Component Replacing 5 Repetitive Chapters */}
        <ContinuousSecurityStory />

        {/* Operational Layer Workspace Invitation */}
        <section className="workspace-invitation reveal">
          <div>
            <span className="eyebrow">THE OPERATIONAL LAYER</span>
            <h2>
              From the big picture.<br />
              <span>Into the details.</span>
            </h2>
            <p>
              Your inventory, traffic, findings and evidence. One focused workspace, connected to the actual security engine.
            </p>
            <Link className="button primary" href="/command-center">
              Enter command center <span>↗</span>
            </Link>
          </div>

          <div className="workspace-preview" aria-label="Workspace navigation preview">
            <div className="preview-heading">
              <Brand compact />
              <span>SECURITY WORKSPACE</span>
              <span>↗</span>
            </div>
            {[
              ['01', 'Endpoint inventory', '/command-center/inventory'],
              ['02', 'Traffic activity', '/command-center/traffic'],
              ['03', 'Threat findings', '/command-center/alerts'],
              ['04', 'Risk intelligence', '/command-center/risk']
            ].map(([n, name, href]) => (
              <Link href={href} key={n}>
                <span>{n}</span>
                {name}
                <b>↗</b>
              </Link>
            ))}
            <small>LIVE DATA LOADS WHEN YOU ENTER THE WORKSPACE.</small>
          </div>
        </section>

        {/* Final Statement */}
        <section className="final-statement reveal">
          <span className="eyebrow">BEYOND THE DOCUMENTED. BEYOND THE EXPECTED.</span>
          <h2>
            Secure what’s<br />
            <em>actually there.</em>
          </h2>
          <Link className="text-link" href="/command-center">
            Open Hyperion ↗
          </Link>
        </section>
      </main>

      <footer className="site-footer">
        <Link href="/">
          <Brand />
        </Link>
        <span>
          BUILT FOR CYBERCUP 6.0 <b>CC6–IC07</b>
        </span>
        <label className="visual-preference">
          VISUAL EXPERIENCE
          <select
            aria-label="Visual experience"
            value={visualMode}
            onChange={event => onVisualMode(event.target.value)}
          >
            <option value="full">Full motion</option>
            <option value="still">Reduced motion</option>
            <option value="light">Light visuals</option>
          </select>
        </label>
        <a href="#main">BACK TO TOP ↑</a>
      </footer>
    </div>
  )
}
