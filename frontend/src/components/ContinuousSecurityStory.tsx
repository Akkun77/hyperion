import { useState } from 'react'
import { Link } from '../router'
import SceneTransition from './SceneTransition'

interface StoryStage {
  id: string
  number: string
  label: string
  title: string
  lead: string
  detail: string
  technicalContext: {
    category: string
    specs: Record<string, string>
  }
}

const STORY_STAGES: StoryStage[] = [
  {
    id: 'discover',
    number: '01',
    label: 'DISCOVER',
    title: 'See what exists.',
    lead: 'Your attack surface doesn’t end at documentation. Discover endpoints from observed traffic and uncover APIs hiding in plain sight.',
    detail: 'Observed edge routes are normalized and continuously reconciled with managed OpenAPI catalogs. Any traffic hitting undocumented endpoints immediately surfaces as a shadow API.',
    technicalContext: {
      category: 'ENDPOINT RESOLUTION',
      specs: {
        'Managed Route': 'GET /api/v1/users/{id}',
        'Catalog Status': 'Documented in OpenAPI 3.0',
        'Service Domain': 'Identity & User Service',
        'Sensitivity': 'Contains PII (User Profile Data)'
      }
    }
  },
  {
    id: 'observe',
    number: '02',
    label: 'OBSERVE',
    title: 'Observe behavior.',
    lead: 'Every request is an authentic signal. Follow live traffic activity across endpoints, identities and remote origins.',
    detail: 'Hyperion logs incoming caller IPs, authentication tokens, request payloads, and status codes into SQLite for continuous telemetry and compliance audit.',
    technicalContext: {
      category: 'EDGE TRAFFIC TELEMETRY',
      specs: {
        'Incoming URI': 'GET /api/v1/users/user_202',
        'Authenticated User': 'user_101',
        'Caller IP': '192.0.2.1',
        'Audit Store': 'SQLite (traffic_logs table)'
      }
    }
  },
  {
    id: 'detect',
    number: '03',
    label: 'DETECT',
    title: 'Detect what matters.',
    lead: 'Find the behavior behind the breach. Surface authorization failures, credential replay, and burst scraping in real time.',
    detail: 'Runtime security engines evaluate caller ownership against the target resource. When user_101 accesses user_202 and receives HTTP 200, the BOLA Ownership Detector triggers with CRITICAL severity.',
    technicalContext: {
      category: 'DETECTOR EVALUATION',
      specs: {
        'Triggered Detector': 'BOLA Ownership Detector',
        'Decision Rule': 'Caller identity does not match resource owner',
        'Observed Status': 'HTTP 200 OK (Unauthorized Bypass)',
        'Severity Level': 'CRITICAL'
      }
    }
  },
  {
    id: 'understand',
    number: '04',
    label: 'UNDERSTAND',
    title: 'Understand every risk.',
    lead: 'No unexplained black-box metrics. Turn endpoint exposure into a transparent, mathematically explainable risk score.',
    detail: 'Risk intelligence combines baseline exposure, authentication signals, PII sensitivity, and active security alerts into an interpretable 0–100 score with visible factor weights.',
    technicalContext: {
      category: 'RISK INTELLIGENCE FORMULA',
      specs: {
        'Dynamic Risk Score': '55 / 100 (HIGH EXPOSURE)',
        'Active Threat Factor': '+30 (BOLA vulnerability)',
        'Data Factor': '+20 (PII payload transmission)',
        'Remediation': 'High Priority Asset Review'
      }
    }
  },
  {
    id: 'prove',
    number: '05',
    label: 'PROVE',
    title: 'Follow the evidence.',
    lead: 'Go from a security alert to the exact HTTP request that caused it. Unalterable forensic context from start to finish.',
    detail: 'Cryptographic binding links Alert #1 directly to persisted Traffic Event #2. Security engineers can inspect raw request headers, IP origins, and timeline evidence in one click.',
    technicalContext: {
      category: 'FORENSIC EVIDENCE BINDING',
      specs: {
        'Security Alert': 'Alert #1 (BOLA)',
        'Originating Event': 'Traffic Event #2',
        'Integrity': 'Immutable SQLite Audit Ledger',
        'Investigation Deep Link': '/command-center/investigation?alert=1'
      }
    }
  }
]

export default function ContinuousSecurityStory() {
  const [currentStage, setCurrentStage] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  const stage = STORY_STAGES[currentStage]

  const goTo = (index: number) => {
    setDirection(index > currentStage ? 'forward' : 'backward')
    setCurrentStage(index)
    // Synchronize 3D loop pulse with story stage
    window.dispatchEvent(
      new CustomEvent('hyperion-demo-stage', {
        detail: {
          stage: index + 1,
          finding: index >= 2,
          signals: [{ kind: index >= 2 ? 'finding' : 'traffic', severity: index >= 2 ? 'critical' : 'info' }]
        }
      })
    )
  }

  return (
    <section id="capabilities" className="continuous-security-story reveal" aria-label="API Security Story">
      <div className="story-container">
        {/* Story Section Header */}
        <header className="story-header">
          <span className="eyebrow">ONE CONTINUOUS SECURITY CYCLE</span>
          <h2 className="story-main-title">
            From the initial signal<br />
            <span>to unalterable evidence.</span>
          </h2>
          <p className="story-intro">
            Follow one API request across all five dimensions of the Hyperion platform.
          </p>

          {/* Stepper Navigation: 01 DISCOVER -> 02 OBSERVE -> 03 DETECT -> 04 UNDERSTAND -> 05 PROVE */}
          <nav className="story-nav-track" aria-label="Security story chapters">
            {STORY_STAGES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`story-nav-pill ${idx === currentStage ? 'active' : ''}`}
                aria-current={idx === currentStage ? 'step' : undefined}
                onClick={() => goTo(idx)}
              >
                <span className="pill-num">{s.number}</span>
                <span className="pill-label">{s.label}</span>
              </button>
            ))}
          </nav>
        </header>

        {/* Cinematic Lateral Transition Active Stage Card */}
        <SceneTransition transitionKey={currentStage} direction={direction}>
          <div className="story-stage-viewport">
            {/* Left: Narrative Copy */}
            <div className="story-narrative-panel">
              <div className="stage-eyebrow-row">
                <span className="stage-number-tag">{stage.number} / 05</span>
                <span className="stage-theme-tag">{stage.label}</span>
              </div>

              <h3 className="stage-title">{stage.title}</h3>
              <p className="stage-lead-text">{stage.lead}</p>
              <p className="stage-detail-text">{stage.detail}</p>

              <div className="story-actions-row">
                <button
                  type="button"
                  className="story-step-btn prev"
                  disabled={currentStage === 0}
                  onClick={() => goTo(currentStage - 1)}
                >
                  ← Previous
                </button>

                <span className="story-step-indicator">
                  {currentStage + 1} of {STORY_STAGES.length}
                </span>

                {currentStage < STORY_STAGES.length - 1 ? (
                  <button
                    type="button"
                    className="story-step-btn next primary"
                    onClick={() => goTo(currentStage + 1)}
                  >
                    Next Stage →
                  </button>
                ) : (
                  <Link className="story-step-btn next primary" href="/command-center/investigation?alert=1">
                    Inspect Real Evidence →
                  </Link>
                )}
              </div>
            </div>

            {/* Right: Technical Spec Card */}
            <div className="story-telemetry-panel">
              <div className="telemetry-card">
                <div className="telemetry-card-header">
                  <span className="telemetry-badge">{stage.technicalContext.category}</span>
                  <span className="telemetry-indicator">● LIVE CONTEXT</span>
                </div>

                <div className="telemetry-specs-list">
                  {Object.entries(stage.technicalContext.specs).map(([label, val]) => (
                    <div key={label} className="telemetry-spec-row">
                      <span className="spec-field">{label}</span>
                      <span className={`spec-value ${label.includes('Status') || label.includes('Score') ? 'highlight' : ''}`}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                {stage.id === 'prove' && (
                  <div className="telemetry-card-cta">
                    <Link className="button primary" href="/command-center/investigation?alert=1">
                      Open Investigation Record #1 ↗
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SceneTransition>
      </div>
    </section>
  )
}
