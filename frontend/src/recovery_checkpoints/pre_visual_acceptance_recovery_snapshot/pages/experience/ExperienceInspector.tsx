import React, { useState } from 'react';
import { Link } from '../../router';
import { ScenarioRecord, STAGES, StageIndex } from './scenarioData';

interface ExperienceInspectorProps {
  scenario: ScenarioRecord;
  currentStage: StageIndex;
  decisionOverride: 'ALLOW' | 'FLAG' | 'BLOCK' | null;
  onSetDecisionOverride: (mode: 'ALLOW' | 'FLAG' | 'BLOCK' | null) => void;
}

export const ExperienceInspector: React.FC<ExperienceInspectorProps> = ({
  scenario,
  currentStage,
  decisionOverride,
  onSetDecisionOverride,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'headers' | 'policy' | 'evidence'>('details');

  const stage = STAGES[currentStage];
  const activeDecision = decisionOverride || scenario.gatewayDecision;
  const isAllow = activeDecision === 'ALLOW';
  const isFlag = activeDecision === 'FLAG';
  const isBlock = activeDecision === 'BLOCK';

  const badgeClass = isAllow ? 'allow' : isFlag ? 'flag' : 'block';

  // Construct valid investigation deep-link
  const eventId = scenario.id.startsWith('rec_')
    ? scenario.id.replace('rec_', '')
    : '101';
  const investigationLink = `/command-center/investigation?event=${encodeURIComponent(eventId)}`;

  return (
    <aside className="experience-inspector-root" aria-label="Technical Stage Inspector">
      {/* Stage Header */}
      <header className="inspector-header">
        <div className="inspector-eyebrow">
          <span>STAGE 0{currentStage + 1} // {stage.location}</span>
          <span className={`provenance-pill ${scenario.provenance.toLowerCase().replace(' ', '-')}`}>
            {scenario.provenance}
          </span>
        </div>
        <h3 className="inspector-title">{stage.title}</h3>
        <p className="inspector-tagline">{stage.shortDesc}</p>
      </header>

      {/* Decision Interactive Comparator */}
      <div className="inspector-comparator-box" role="region" aria-label="Gateway Decision Comparison">
        <div className="comparator-label-row">
          <span className="comparator-label">DECISION STATE MACHINE</span>
          <span className={`decision-badge ${badgeClass}`}>{activeDecision}</span>
        </div>
        <div className="comparator-buttons" role="radiogroup" aria-label="Select Decision Mode">
          <button
            type="button"
            role="radio"
            aria-checked={activeDecision === 'ALLOW'}
            className={`comp-btn allow ${activeDecision === 'ALLOW' ? 'active' : ''}`}
            onClick={() => onSetDecisionOverride(activeDecision === 'ALLOW' ? null : 'ALLOW')}
          >
            ALLOW (Forward)
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={activeDecision === 'FLAG'}
            className={`comp-btn flag ${activeDecision === 'FLAG' ? 'active' : ''}`}
            onClick={() => onSetDecisionOverride(activeDecision === 'FLAG' ? null : 'FLAG')}
          >
            FLAG (Trace)
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={activeDecision === 'BLOCK'}
            className={`comp-btn block ${activeDecision === 'BLOCK' ? 'active' : ''}`}
            onClick={() => onSetDecisionOverride(activeDecision === 'BLOCK' ? null : 'BLOCK')}
          >
            BLOCK (Intercept)
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="inspector-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'details'}
          className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Stage Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'headers'}
          className={`tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          HTTP Wire
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'policy'}
          className={`tab-btn ${activeTab === 'policy' ? 'active' : ''}`}
          onClick={() => setActiveTab('policy')}
        >
          Policy Rules
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'evidence'}
          className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
          onClick={() => setActiveTab('evidence')}
        >
          Evidence
        </button>
      </nav>

      {/* Tab Panels */}
      <div className="inspector-tab-content">
        {activeTab === 'details' && (
          <div className="data-grid">
            <div className="data-row">
              <span className="data-key">HTTP Method</span>
              <span className="data-val bold mono method-tag">{scenario.method}</span>
            </div>
            <div className="data-row">
              <span className="data-key">Resource Path</span>
              <span className="data-val mono">{scenario.endpoint}</span>
            </div>
            <div className="data-row">
              <span className="data-key">Client Caller</span>
              <span className="data-val mono">{scenario.clientIp}</span>
            </div>
            <div className="data-row">
              <span className="data-key">Gateway Proxy</span>
              <span className="data-val mono">0.0.0.0:8000</span>
            </div>
            <div className="data-row">
              <span className="data-key">Upstream Status</span>
              <span className="data-val mono">
                {isBlock ? (
                  <span className="text-muted">Unreached (Intercepted at Gateway)</span>
                ) : (
                  <span>Reached // HTTP {scenario.upstreamStatusCode || 200}</span>
                )}
              </span>
            </div>
            <div className="data-row">
              <span className="data-key">Final Client Code</span>
              <span className={`data-val mono bold status-code ${scenario.statusCode >= 400 ? 'status-err' : 'status-ok'}`}>
                HTTP {isBlock ? 429 : scenario.statusCode}
              </span>
            </div>
            <div className="data-row">
              <span className="data-key">Round-trip Latency</span>
              <span className="data-val mono">{isBlock ? '2ms (Gateway)' : `${scenario.latencyMs}ms (Proxy + Upstream)`}</span>
            </div>
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="wire-headers-view">
            <span className="section-label">INCOMING HTTP HEADERS</span>
            <div className="code-block">
              {Object.entries(scenario.headers).map(([k, v]) => (
                <div key={k} className="header-line">
                  <span className="header-key">{k}:</span> <span className="header-val">{v}</span>
                </div>
              ))}
            </div>

            {scenario.payload && (
              <>
                <span className="section-label" style={{ marginTop: '0.8rem' }}>REQUEST BODY</span>
                <pre className="payload-block">{scenario.payload}</pre>
              </>
            )}
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="policy-view">
            <div className="policy-rule-card">
              <span className="rule-title">GATEWAY DECISION REASON</span>
              <p className="rule-body mono">{scenario.decisionReason}</p>
            </div>
            <div className="policy-rule-card">
              <span className="rule-title">SECURITY INVARIANT NOTES</span>
              <p className="rule-body">{scenario.policyNotes}</p>
            </div>
            <div className="policy-rule-card">
              <span className="rule-title">POLICY SPECIFICATION</span>
              <p className="rule-body">
                Gateway rule engine operates as an inline reverse proxy. Gateway ALLOW/FLAG/BLOCK
                decisions and upstream HTTP status are separate operational dimensions.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="evidence-view">
            <div className="data-grid">
              <div className="data-row">
                <span className="data-key">Evidence ID</span>
                <span className="data-val mono">{scenario.evidenceId}</span>
              </div>
              <div className="data-row">
                <span className="data-key">Fingerprint Hash</span>
                <span className="data-val mono hash-truncate">{scenario.evidenceHash}</span>
              </div>
              <div className="data-row">
                <span className="data-key">Timestamp</span>
                <span className="data-val mono">{new Date(scenario.timestamp).toISOString()}</span>
              </div>
              {scenario.linkedAlertId && (
                <div className="data-row">
                  <span className="data-key">Linked Alert</span>
                  <span className="data-val mono alert-tag">{scenario.linkedAlertId}</span>
                </div>
              )}
            </div>

            {scenario.alertDesc && (
              <div className="alert-finding-card">
                <div className="alert-header">
                  <span className={`alert-sev-badge ${scenario.alertSeverity || 'medium'}`}>
                    {(scenario.alertSeverity || 'medium').toUpperCase()} SEVERITY
                  </span>
                  <span className="alert-type mono">{scenario.alertType}</span>
                </div>
                <p className="alert-text">{scenario.alertDesc}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operational Actions */}
      <footer className="inspector-actions">
        <Link
          href={investigationLink}
          className="inspector-action-btn primary"
          title="Open this recorded request in the Command Center Investigation View"
        >
          Inspect in Command Center ↗
        </Link>
        <Link
          href="/command-center/gateway"
          className="inspector-action-btn secondary"
          title="View active Gateway rules in Command Center"
        >
          View Gateway Policies
        </Link>
      </footer>
    </aside>
  );
};
