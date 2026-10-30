import { FormEvent, useEffect, useState } from 'react'
import { Link } from '../router'
import { ConnectionDraft, ConnectionRecord, ConnectionValidation, productRequest } from './productApi'

export default function ConnectAPI(){
 const [kind,setKind]=useState<ConnectionDraft['kind']>('manual')
 const [name,setName]=useState('');const [base,setBase]=useState('')
 const [routes,setRoutes]=useState('GET /api/v1/users/{id}')
 const [spec,setSpec]=useState('');const [authorized,setAuthorized]=useState(false)
 const [validation,setValidation]=useState<ConnectionValidation|null>(null)
 const [receipt,setReceipt]=useState<ConnectionRecord|null>(null)
 const [connections,setConnections]=useState<ConnectionRecord[]>([])
 const [busy,setBusy]=useState(false);const [error,setError]=useState('')
 const refresh=async(signal?:AbortSignal)=>{
  try{setConnections(await productRequest<ConnectionRecord[]>('connections',signal))}
  catch(reason){if(!signal?.aborted)setError(reason instanceof Error?reason.message:'Connection status unavailable.')}
 }
 useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort()},[])
 const draft=():ConnectionDraft=>({kind,name:name||'Authorized API',base_url:base,routes:kind==='manual'?routes.split('\n').filter(row=>row.trim()).map(row=>{const [method,...parts]=row.trim().split(/\s+/);return{method,path:parts.join(' ')}}):[],...(kind==='openapi'?{specification:JSON.parse(spec)}:{}),authorized})
 const validate=async(event:FormEvent)=>{
  event.preventDefault();setBusy(true);setError('');setReceipt(null)
  try{setValidation(await productRequest<ConnectionValidation>('connections/validate',undefined,draft()))}
  catch(reason){setError(reason instanceof SyntaxError?'Specification is not valid JSON. YAML and external URL imports are not supported.':reason instanceof Error?reason.message:'Validation failed.')}
  finally{setBusy(false)}
 }
 const register=async()=>{
  setBusy(true);setError('')
  try{setReceipt(await productRequest<ConnectionRecord>('connections',undefined,draft()));setValidation(null);await refresh()}
  catch(reason){setError(reason instanceof Error?reason.message:'Registration failed.')}
  finally{setBusy(false)}
 }
 return <section className="connect-workflow" aria-label="Connect API workflow">
  <p className="workflow-introduction">Establish a documented catalog, then choose an honest capture boundary. A submitted URL is not an active monitor. Only connect APIs you own or are authorized to test.</p>
  <div className="workflow-step-label">01 Validate <span>→</span> 02 Register <span>→</span> 03 Capture & status</div>
  <div className="workflow-modes" aria-label="Connection method">{[['manual','Register manually'],['openapi','Import OpenAPI JSON'],['demo','Built-in controlled demo']].map(([value,label])=><button key={value} aria-pressed={kind===value} disabled={busy} onClick={()=>{setKind(value as ConnectionDraft['kind']);setAuthorized(false);setValidation(null);setReceipt(null);setError('')}}>{label}</button>)}</div>
  {error&&<p role="alert" className="error-text">{error}</p>}
  {!validation&&!receipt&&<form onSubmit={validate} className="connection-form">
   {kind==='demo'?<p>The built-in API already runs inside this FastAPI process. Connecting it registers its managed routes; no traffic is generated until you explicitly run a scenario.</p>:<><label>API name<input aria-label="API name" value={name} maxLength={100} required onChange={e=>setName(e.target.value)}/></label><label>Base URL<input aria-label="API base URL" placeholder="https://api.example.com" type="url" value={base} onChange={e=>setBase(e.target.value)} required={kind==='manual'}/></label></>}
   {kind==='manual'&&<label>Documented operations · one METHOD /path per line<textarea aria-label="Documented operations" rows={4} value={routes} onChange={e=>setRoutes(e.target.value)} maxLength={60000} required/></label>}
   {kind==='openapi'&&<><label>OpenAPI JSON file (under 1 MB)<input aria-label="OpenAPI JSON file" type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1000000){setError('Choose a JSON file under 1 MB.');return}setSpec(await file.text());setError('')}}/></label><label>Or paste specification JSON<textarea aria-label="OpenAPI specification JSON" value={spec} onChange={e=>setSpec(e.target.value)} rows={7} maxLength={1000000} required/></label><small>OpenAPI 3.x / Swagger 2.0 route validation. External references, remote fetching and schema resolution are not performed. An absolute base URL is required, here or in the specification.</small></>}
   <button className="button secondary" disabled={busy} type="submit">{busy?'Validating…':'Validate connection ↗'}</button>
  </form>}
  {validation&&<div className="workflow-reveal"><h2>Documented operations validated</h2><p>{validation.routes.length} unique operations · {validation.base_url}</p><ul className="validated-routes">{validation.routes.map(route=><li key={route.method+route.path}><code>{route.method} {route.path}</code></li>)}</ul><h3>How traffic can be captured</h3><ul>{validation.capture_options.map(option=><li key={option}>{option}</li>)}</ul><p>{validation.limitations}</p><label className="workflow-consent"><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/>I own or am authorized to register and test this API.</label><div className="workflow-actions"><button className="button secondary" disabled={busy||!authorized} onClick={register}>{busy?'Registering…':'Register documented API ↗'}</button><button className="filter-reset" disabled={busy} onClick={()=>setValidation(null)}>← Edit details</button></div></div>}
  {receipt&&<div className="workflow-reveal" role="status"><span className="eyebrow">CATALOG CONNECTION SAVED</span><h2>{receipt.status==='registered_only'?'Registered — capture not active':'Local demo traffic observed'}</h2><p>{receipt.message}</p><p>Capture: {receipt.capture_method}</p><Link className="text-link" href={receipt.kind==='demo'?'/watch':'/command-center/inventory'}>{receipt.kind==='demo'?'Watch Hyperion work ↗':'View documented inventory ↗'}</Link><button className="filter-reset" onClick={()=>{setReceipt(null);setAuthorized(false)}}>Connect another API</button></div>}
  <section className="connections-list"><div className="panel-heading"><h2>Registered connections</h2><button className="filter-reset" disabled={busy} onClick={()=>void refresh()}>Refresh connection status</button></div>{!connections.length&&<p>No connections registered yet.</p>}{connections.map(row=><article key={row.id}><div><h3>{row.name}</h3><code>{row.base_url}</code><p>{row.routes.length} operations · {row.capture_method}</p></div><div><strong>{row.status==='local_traffic_observed'?'Local traffic observed':'Registered only'}</strong><p>{row.kind === 'demo' ? `${row.observed_requests} verified local requests` : 'Monitoring not configured'}</p>{row.last_observed_at && <p>Last observed: {row.last_observed_at}</p>}</div></article>)}<p className="workflow-footnote">External origins remain “Registered only” until a supported capture integration is implemented. Existing local path observations do not prove monitoring of a different origin. No remote reachability test or URL fetch is performed.</p></section>
 </section>
}
