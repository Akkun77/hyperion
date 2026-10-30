import { useState, useEffect } from 'react'
import { Link } from '../router'
import SceneTransition from './SceneTransition'

interface QuestionStep {
  stepNumber: number
  question: string
  headline: string
  body: string
  specs: Record<string, string>
}

const QUESTION_STEPS: QuestionStep[] = [
  {
    stepNumber: 1,
    question: '01 / WHAT REQUEST IS BEING MADE?',
    headline: 'An authenticated user requests another user’s account record.',
    body: 'Token subject user_101 transmits a standard GET request to /api/v1/users/{id} targeting record user_202 belonging to a completely separate tenant.',
    specs: {
      'HTTP Method & Route': 'GET /api/v1/users/user_202',
      'Caller Identity': 'user_101 (Bearer Token)',
      'Target Resource': 'user_202',
      'Origin IP': '192.0.2.1'
    }
  },
  {
    stepNumber: 2,
    question: '02 / WHAT DOES HYPERION OBSERVE?',
    headline: 'Hyperion resolves the route against the OpenAPI catalog.',
    body: 'The request is classified as a documented endpoint under Identity & User Service and tagged for sensitive personal data (PII) transmission.',
    specs: {
      'Catalog Match': 'Identity & User Service (/api/v1/users/{id})',
      'Documentation Status': 'Documented in OpenAPI Spec',
      'Data Classification': 'Contains PII (User Profile Attributes)',
      'Audit Ledger': 'Persisted in SQLite (traffic_logs #2)'
    }
  },
  {
    stepNumber: 3,
    question: '03 / WHY IS THE BEHAVIOR SUSPICIOUS?',
    headline: 'The API server returned HTTP 200 instead of HTTP 403.',
    body: "Because user_101 does not own record user_202, the server should have rejected the request with HTTP 403 Forbidden. Instead, it returned HTTP 200 OK with the victim's data.",
    specs: {
      'Authorization Check': 'Token subject (user_101) != Target owner (user_202)',
      'Observed Response': 'HTTP 200 OK (Unauthorized Access Bypass)',
      'Expected Response': 'HTTP 403 Forbidden',
      'Vulnerability Type': 'Broken Object Level Authorization (BOLA)'
    }
  },
  {
    stepNumber: 4,
    question: '04 / WHAT FINDING WAS PRODUCED?',
    headline: 'BOLA Ownership Detector triggers with CRITICAL severity.',
    body: 'This illustrative preview has no attached backend execution. Its endpoint risk score is Not available. Open the full controlled walkthrough to inspect an actual recorded result.',
    specs: {
      'Security Alert ID': 'Alert #1 (BOLA)',
      'Severity Level': 'CRITICAL',
      'Dynamic Risk Score': 'Not available',
      'Risk Factors': 'Not available'
    }
  },
  {
    stepNumber: 5,
    question: '05 / WHERE IS THE SUPPORTING EVIDENCE?',
    headline: 'Cryptographic binding links the Alert directly to Traffic Event #2.',
    body: 'Security analysts can inspect the complete immutable transaction: caller IP, raw headers, payload bytes, and exact timestamp in the Investigation module.',
    specs: {
      'Linked Traffic Event': 'Traffic Event #2 in SQLite ledger',
      'Linked Finding': 'Security Alert #1',
      'Integrity': 'Cryptographically verified audit trail',
      'Investigation Action': 'Ready for one-click forensic drilldown'
    }
  }
]

export default function HomepageDemoPreview() {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [autoPlaying, setAutoPlaying] = useState(false)

  const step = QUESTION_STEPS[currentStep]

  const goToStep = (index: number) => {
    setAutoPlaying(false)
    setDirection(index > currentStep ? 'forward' : 'backward')
    setCurrentStep(index)

    // Trigger loop pulse on geometry
    window.dispatchEvent(
      new CustomEvent('hyperion-demo-stage', {
        detail: {
          stage: index + 1,
          finding: index >= 3,
          signals: [{ kind: index >= 3 ? 'finding' : 'traffic', severity: index >= 3 ? 'critical' : 'info' }]
        }
      })
    )
  }

  // Auto replay on click
  useEffect(() => {
    if (!autoPlaying) return
    const timer = setTimeout(() => {
      if (currentStep < QUESTION_STEPS.length - 1) {
        setDirection('forward')
        setCurrentStep(s => s + 1)
        window.dispatchEvent(
          new CustomEvent('hyperion-demo-stage', {
            detail: {
              stage: currentStep + 2,
              finding: currentStep + 1 >= 3,
              signals: [{ kind: currentStep + 1 >= 3 ? 'finding' : 'traffic', severity: currentStep + 1 >= 3 ? 'critical' : 'info' }]
            }
          })
        )
      } else {
        setAutoPlaying(false)
      }
    }, 1800)
    return () => clearTimeout(timer)
  }, [autoPlaying, currentStep])

  const startReplay = () => {
    setCurrentStep(0)
    setDirection('forward')
    setAutoPlaying(true)
    window.dispatchEvent(
      new CustomEvent('hyperion-demo-stage', {
        detail: { stage: 1, finding: false, signals: [{ kind: 'traffic', severity: 'info' }] }
      })
    )
  }

  return (
    <section className="homepage-demo-preview reveal" aria-label="Interactive BOLA Demonstration Preview">
      <div className="preview-container">
        {/* Section Header */}
        <header className="preview-header">
          <div className="preview-badge-row">
            <span className="eyebrow">VERIFIED BACKEND DEMONSTRATION</span>
            <span className="live-demo-tag">● RECORDED SCENARIO</span>
          </div>

          <h2 className="preview-title">
            Watch a request become<br />
            <span>a security finding.</span>
          </h2>
          <p className="preview-subhead">
            Five core questions answered by Hyperion's real-time security engine.
          </p>

          {/* Stepper Buttons for the 5 Questions */}
          <nav className="preview-step-nav" aria-label="Demonstration questions">
            {QUESTION_STEPS.map((q, idx) => (
              <button
                key={q.stepNumber}
                type="button"
                className={`step-nav-pill ${idx === currentStep ? 'active' : ''}`}
                aria-current={idx === currentStep ? 'step' : undefined}
                onClick={() => goToStep(idx)}
              >
                <span className="pill-index">0{q.stepNumber}</span>
                <span className="pill-text">{q.question.split('/ ')[1]}</span>
              </button>
            ))}
          </nav>
        </header>

        {/* Cinematic Lateral Transition Card */}
        <SceneTransition transitionKey={currentStep} direction={direction}>
          <div className="preview-content-card">
            <div className="preview-narrative">
              <span className="question-eyebrow">{step.question}</span>
              <h3 className="question-headline">{step.headline}</h3>
              <p className="question-body">{step.body}</p>

              <div className="preview-button-row">
                {currentStep < QUESTION_STEPS.length - 1 ? (
                  <button
                    type="button"
                    className="button primary preview-next-btn"
                    onClick={() => goToStep(currentStep + 1)}
                  >
                    Next Question →
                  </button>
                ) : (
                  <Link
                    className="button primary preview-next-btn"
                    href="/command-center/investigation?alert=1"
                  >
                    Inspect Real Evidence in Investigation →
                  </Link>
                )}

                <button
                  type="button"
                  className="preview-replay-btn"
                  onClick={startReplay}
                >
                  {autoPlaying ? 'Replaying…' : 'Replay Walkthrough ↺'}
                </button>

                <Link className="preview-full-link" href="/watch">
                  Open Full 7-Stage Walkthrough ↗
                </Link>
              </div>
            </div>

            {/* Technical Context Table */}
            <div className="preview-telemetry-box">
              <span className="telemetry-box-label">AUDIT TELEMETRY · BOLA RECORD</span>
              <dl className="preview-specs-grid">
                {Object.entries(step.specs).map(([k, v]) => (
                  <div key={k} className="preview-spec-item">
                    <dt className="spec-k">{k}</dt>
                    <dd className={`spec-v ${k.includes('Response') || k.includes('Severity') ? 'alert-val' : ''}`}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </SceneTransition>
      </div>
    </section>
  )
}
