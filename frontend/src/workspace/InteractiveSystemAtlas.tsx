import React, { useState } from 'react'
import { Link } from '../router'
import { RiskHierarchyResponse, InventoryEndpoint, SecurityAlert } from '../types'

interface InteractiveSystemAtlasProps {
  hierarchy: RiskHierarchyResponse | null
  inventory: InventoryEndpoint[]
  alerts: SecurityAlert[]
  onInspectEndpoint?: (id: number | string) => void
}

export const InteractiveSystemAtlas: React.FC<InteractiveSystemAtlasProps> = ({
  hierarchy,
  inventory,
  alerts,
}) => {
  const services = hierarchy?.services || []
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || 'identity-users')
  const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null)

  const activeServiceId = hoveredServiceId || selectedServiceId
  const activeService = services.find(s => s.id === activeServiceId) || services[0]

  // Endpoints attached to active service
  const serviceEndpoints = activeService?.endpoints && activeService.endpoints.length > 0
    ? activeService.endpoints
    : inventory.filter(ep => {
        if (!activeService) return false
        const sName = activeService.name.toLowerCase()
        if (sName.includes('user') || sName.includes('identity')) return ep.endpoint.includes('/user') || ep.endpoint.includes('/auth')
        if (sName.includes('payment') || sName.includes('billing')) return ep.endpoint.includes('/payment') || ep.endpoint.includes('/checkout')
        if (sName.includes('infra') || sName.includes('system')) return ep.endpoint.includes('/health') || ep.endpoint.includes('/metrics')
        if (sName.includes('core')) return ep.endpoint.includes('/items') || ep.endpoint.includes('/products')
        return true
      }).slice(0, 6)

  // Correlated alerts for active service
  const correlatedAlerts = alerts.slice(0, 4)

  const getRiskColor = (score: number) => {
    if (score >= 70) return '#EA777C' // Block / High
    if (score >= 40) return '#E9BA6A' // Flag / Med
    return '#62D4A1' // Allow / Low
  }

  return (
    <div className="system-atlas-root" aria-label="Interactive System Atlas and Invariant Topology">
      {/* Topology Header */}
      <div className="atlas-instrument-head">
        <div className="atlas-head-meta">
          <div className="atlas-kicker mono">SYSTEM TOPOLOGY &middot; PERIMETER ARCHITECTURE</div>
          <h2 className="atlas-title">Interactive System Atlas</h2>
          <p className="atlas-subtitle">
            Dynamic service topology: <strong className="mono">PLATFORM &rarr; {services.length} SERVICES &rarr; {inventory.length} ENDPOINTS &rarr; {alerts.length} CORRELATED FINDINGS</strong>
          </p>
        </div>

        <div className="atlas-service-selector-pills mono">
          {services.map(srv => {
            const isSelected = selectedServiceId === srv.id
            const color = getRiskColor(srv.risk_score)
            return (
              <button
                key={srv.id}
                type="button"
                className={`atlas-service-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedServiceId(srv.id)}
                onMouseEnter={() => setHoveredServiceId(srv.id)}
                onMouseLeave={() => setHoveredServiceId(null)}
              >
                <span className="pill-dot" style={{ background: color, boxShadow: isSelected ? `0 0 8px ${color}` : 'none' }} />
                <span className="pill-name">{srv.name.split(' ')[0]}</span>
                <span className="pill-risk" style={{ color }}>{srv.risk_score}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Interactive Topology Graph Visualizer */}
      <div className="atlas-topology-canvas-wrap">
        <div className="topology-columns-grid">
          {/* Level 1: Platform Gateway Core */}
          <div className="topology-node-col platform-col">
            <div className="platform-anchor-node">
              <div className="node-kicker mono">INGRESS HORIZON</div>
              <div className="platform-node-title">HYPERION GATEWAY</div>
              <div className="platform-node-port mono">127.0.0.1:8000 &middot; ARMED</div>
              <div className="platform-invariants-tag mono">
                <span>REVERSE PROXY</span>
                <span>INVARIANT EVAL</span>
              </div>
            </div>
          </div>

          {/* Topology Conduit SVG (Platform -> Services) */}
          <div className="topology-conduits-col">
            <svg className="topology-svg-wires" viewBox="0 0 120 320" preserveAspectRatio="none" aria-hidden="true">
              {services.map((srv, idx) => {
                const isActive = activeServiceId === srv.id
                const yStart = 160
                const yEnd = 32 + idx * (256 / Math.max(1, services.length - 1))
                const color = getRiskColor(srv.risk_score)
                return (
                  <path
                    key={srv.id}
                    d={`M 0,${yStart} C 60,${yStart} 60,${yEnd} 120,${yEnd}`}
                    fill="none"
                    stroke={isActive ? color : 'rgba(255, 255, 255, 0.12)'}
                    strokeWidth={isActive ? '2.5' : '1'}
                    strokeDasharray={isActive ? 'none' : '3 3'}
                    className={`topology-wire ${isActive ? 'wire-active' : ''}`}
                  />
                )
              })}
            </svg>
          </div>

          {/* Level 2: Service Domains Deck */}
          <div className="topology-node-col services-col">
            <div className="services-deck-stack">
              {services.map((srv) => {
                const isSelected = selectedServiceId === srv.id
                const isHovered = hoveredServiceId === srv.id
                const isActive = isSelected || isHovered
                const riskColor = getRiskColor(srv.risk_score)

                return (
                  <div
                    key={srv.id}
                    className={`atlas-service-entity ${isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedServiceId(srv.id)}
                    onMouseEnter={() => setHoveredServiceId(srv.id)}
                    onMouseLeave={() => setHoveredServiceId(null)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelectedServiceId(srv.id)}
                  >
                    <div className="service-entity-head">
                      <div className="service-entity-title-group">
                        <span className="service-entity-name">{srv.name}</span>
                        <span className="service-entity-endpoints mono">{srv.endpoint_count || srv.endpoints?.length || 1} routes</span>
                      </div>
                      <div className="service-risk-gauge mono" style={{ borderColor: riskColor, color: riskColor }}>
                        {srv.risk_score}
                      </div>
                    </div>

                    <div className="service-entity-meta mono">
                      <span style={{ color: srv.alert_count > 0 ? '#E9BA6A' : '#8A929F' }}>
                        {srv.alert_count} Findings
                      </span>
                      <span>&middot;</span>
                      <span className="service-driver-summary">
                        {srv.drivers?.[0] || 'Invariants Stable'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Level 3: Attached Endpoints & Findings for Active Service */}
          <div className="topology-node-col endpoints-col">
            <div className="attached-endpoints-panel">
              <div className="attached-panel-header mono">
                <span>ATTACHED ENDPOINTS ({activeService?.name.toUpperCase()})</span>
                <span>{serviceEndpoints.length} ACTIVE</span>
              </div>

              <div className="attached-endpoints-list">
                {serviceEndpoints.length > 0 ? (
                  serviceEndpoints.map(ep => (
                    <Link
                      key={ep.id}
                      href={`/command-center/investigation?endpoint=${ep.id}`}
                      className="attached-endpoint-item"
                    >
                      <div className="ep-badge-row">
                        <span className={`method-badge method-${ep.method.toLowerCase()} mono`}>
                          {ep.method}
                        </span>
                        <code className="ep-path mono">{ep.endpoint}</code>
                        {ep.is_shadow && <span className="shadow-pill mono">SHADOW</span>}
                      </div>
                      <div className="ep-meta-row mono">
                        <span className="ep-calls">{ep.total_calls} calls</span>
                        <span className="ep-risk-pill" style={{ color: getRiskColor(ep.risk_score) }}>
                          RISK {ep.risk_score}
                        </span>
                        <span className="ep-inspect-arrow">&rarr;</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="ep-empty-state mono">No endpoints attached to this domain.</div>
                )}
              </div>

              {/* Correlated Evidence Linkage */}
              {correlatedAlerts.length > 0 && (
                <div className="correlated-alerts-subdeck">
                  <div className="correlated-head mono">CORRELATED SECURITY FINDINGS</div>
                  <div className="correlated-chips">
                    {correlatedAlerts.map(alert => (
                      <Link
                        key={alert.alert_id}
                        href={`/command-center/investigation?alert=${alert.alert_id}`}
                        className="correlated-chip mono"
                      >
                        <span className="chip-sev">{alert.severity}</span>
                        <span className="chip-type">{alert.alert_type.replace('_', ' ')}</span>
                        <span className="chip-link">Inspect #{alert.alert_id} &rarr;</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default InteractiveSystemAtlas
