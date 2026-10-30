import { Link } from '../router'
import type { RiskHierarchyResponse } from '../types'
export default function RiskHierarchy({data}:{data:RiskHierarchyResponse}) {
 const platform=data.platform
 return <section className="risk-tree" aria-label="Platform to evidence hierarchy">
  <p className="hierarchy-path">Platform <span>→</span> Service <span>→</span> Endpoint <span>→</span> Findings <span>→</span> Evidence</p>
  <div className="tree-platform"><div><span className="eyebrow">ORGANIZATION / PLATFORM</span><h2>{platform.name}</h2><p>{platform.organization}</p></div><strong>{platform.risk_score}<small> / 100 · {platform.severity}</small></strong></div>
  <p className="hierarchy-explainer">{platform.total_services} services · {platform.total_endpoints} catalog endpoints · {platform.active_alerts_count} unique findings. Select a service, then an endpoint.</p>
  <details className="risk-formula"><summary>How hierarchy scores are calculated</summary><p>Service: 60% maximum endpoint score + 40% average endpoint score. Platform: 50% maximum service score + 50% average service score. Scores are rounded and bounded to 0–100. Alert IDs are counted once, not added repeatedly across method variants.</p><ul>{platform.factors.map(factor=><li key={factor}>{factor}</li>)}</ul></details>
  <div className="tree-services">{data.services.map(service=><details className="tree-service" key={service.id}><summary><span><small>SERVICE</small><strong>{service.name}</strong><em>{service.endpoint_count} endpoints · {service.alert_count} findings</em></span><b>{service.endpoints.some(endpoint=>endpoint.total_calls) ? <>{service.risk_score}<small> / 100</small></> : 'Not evaluated'}</b></summary><div className="tree-reveal"><p>{service.description}</p><ul className="tree-drivers">{service.drivers.map(driver=><li key={driver}>{driver}</li>)}</ul>
   {service.endpoints.map(endpoint=><details className="tree-endpoint" key={endpoint.id}><summary><span><small>ENDPOINT / {endpoint.is_shadow?'SHADOW':'CATALOG'}</small><code>{endpoint.method} {endpoint.endpoint}</code><em>{endpoint.total_calls?`${endpoint.total_calls} recorded requests`:'Registered · no traffic observed'}</em></span><b>{endpoint.total_calls ? <>{endpoint.risk_score}<small> / 100</small></> : 'Not evaluated'}</b></summary><div className="tree-reveal"><h3>Why this score?</h3><ul>{endpoint.risk_reasons.map(reason=><li key={reason}>{reason}</li>)}</ul><p>Authentication observed: {endpoint.auth_type}. Last seen: {endpoint.last_seen||'No observation'}.</p><Link className="text-link" href={`/command-center/investigation?endpoint=${endpoint.id}`}>Inspect endpoint ↗</Link>
    <h3>Findings → evidence</h3>{endpoint.alerts.length?endpoint.alerts.map(alert=><Link key={alert.alert_id} className="tree-finding" href={`/command-center/investigation?alert=${alert.alert_id}`}><span>#{alert.alert_id} · {alert.alert_type.replace(/_/g,' ')} · {alert.severity}<small>{alert.description}</small></span><b>{alert.related_event_id?`Request #${alert.related_event_id} ↗`:'No linked request ↗'}</b></Link>):<p>No persisted findings associated with this endpoint. This is not a guarantee of security.</p>}
   </div></details>)}
  </div></details>)}</div>
  {!data.services.length&&<p className="workflow-empty">No catalog endpoints yet. Connect an API to establish documented inventory.</p>}
 </section>
}
