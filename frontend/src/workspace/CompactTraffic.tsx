import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import type { SecuritySnapshot } from '../hooks/useSecurityData'
import type { APITrafficEvent } from '../types'
import { Link, navigate } from '../router'
import { useSessionValue } from './useSessionValue'
import { ActivitySummary, RequestPage, productRequest } from './productApi'

const stamp=(value:string)=>new Date(value).toLocaleString()
function Requests({rows}:{rows:APITrafficEvent[]}) {
 return <div className="table-scroll"><table className="traffic-table"><thead><tr><th>Event / observed</th><th>Request</th><th>Caller</th><th>Identity / auth</th><th>HTTP</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td data-label="Event / observed"><Link className="record-link" href={`/command-center/investigation?event=${row.id}`}>#{row.id} ↗</Link><small className="request-time" title={row.timestamp}>{row.timestamp}</small></td><td data-label="Request"><span className="method">{row.method}</span> <code>{row.endpoint}</code></td><td data-label="Caller" className="mono">{row.caller_ip||'Not supplied'}</td><td data-label="Identity / auth">{row.user_id||'Not supplied'}<small className="request-time">{row.auth_type||'None'}</small></td><td data-label="HTTP">{row.status_code}</td></tr>)}</tbody></table></div>
}
export default function CompactTraffic({data}:{data:SecuritySnapshot}) {
 const query=new URLSearchParams(window.location.search)
 const explore=query.get('explore')==='true'
 const page=Math.max(1,Math.min(1000000,Number(query.get('page'))||1))
 const [search,setSearch]=useSessionValue('activity-search','')
 const [period,setPeriod]=useSessionValue('activity-period','60')
 const [method,setMethod]=useSessionValue('activity-method','all')
 const [status,setStatus]=useSessionValue('activity-status','all')
 const [group,setGroup]=useSessionValue('activity-group','endpoint')
 const [interval,setInterval]=useSessionValue('activity-interval','5')
 const [sort,setSort]=useState('time');const [order,setOrder]=useState('desc')
 const [start,setStart]=useState('');const [end,setEnd]=useState('')
 const [summary,setSummary]=useState<ActivitySummary|null>(null)
 const [ledger,setLedger]=useState<RequestPage|null>(null)
 const [error,setError]=useState('');const [loading,setLoading]=useState(false)
 const resetPage=()=>{if(explore&&page!==1)navigate('/command-center/traffic?explore=true&page=1')}
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('')
  const params=new URLSearchParams({period,search,method,status,group,interval})
  if(start)params.set('start',new Date(start).toISOString());if(end)params.set('end',new Date(end).toISOString())
  const summaryCall=productRequest<ActivitySummary>(`traffic-summary?${params}`,controller.signal).then(result=>{if(!controller.signal.aborted)setSummary(result)})
  const ledgerCall=explore?productRequest<RequestPage>(`requests?${new URLSearchParams({period,search,method,status,page:String(page),page_size:'25',sort,order,...(start?{start:new Date(start).toISOString()}:{}),...(end?{end:new Date(end).toISOString()}:{})})}`,controller.signal).then(result=>{if(!controller.signal.aborted)setLedger(result)}):Promise.resolve()
  Promise.all([summaryCall,ledgerCall]).catch(reason=>{if(!controller.signal.aborted)setError(reason.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[data,period,search,method,status,group,interval,explore,page,sort,order,start,end])
 return <section className="activity-view">
  <div className="table-toolbar"><label className="search-field"><span>⌕</span><input aria-label="Search traffic" placeholder="Endpoint, caller, user or event ID" value={search} onChange={e=>{setSearch(e.target.value);resetPage()}}/></label>
   <select aria-label="Traffic time range" value={period} onChange={e=>{setPeriod(e.target.value);resetPage()}}><option value="15">Last 15 minutes</option><option value="60">Last hour</option><option value="1440">Last 24 hours</option><option value="all">All recorded history</option></select>
   <select aria-label="Traffic method" value={method} onChange={e=>{setMethod(e.target.value);resetPage()}}><option value="all">All methods</option>{['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map(m=><option key={m}>{m}</option>)}</select>
   <select aria-label="Response status" value={status} onChange={e=>{setStatus(e.target.value);resetPage()}}><option value="all">All responses</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}xx responses</option>)}</select>
   <button className="filter-reset" onClick={()=>{setSearch('');setPeriod('60');setMethod('all');setStatus('all');setGroup('endpoint');setInterval('5');setStart('');setEnd('');resetPage()}}>Clear filters</button>
  </div>
  <details className="precise-window"><summary>Exact timestamp window</summary><label>From (local time)<input type="datetime-local" aria-label="Traffic start" value={start} onChange={e=>{setStart(e.target.value);setPeriod('all');resetPage()}}/></label><label>Through (local time)<input type="datetime-local" aria-label="Traffic end" value={end} onChange={e=>{setEnd(e.target.value);setPeriod('all');resetPage()}}/></label></details>
  {error&&<p role="alert" className="error-text">{error} Last successful results, if shown, may not match the selected filters.</p>}
  <p className="activity-status" role="status">{loading?'Updating server-side activity…':summary?`${summary.total_requests.toLocaleString()} requests in selected period · ${summary.unique_endpoints} unique endpoints`:'Awaiting activity summary.'}</p>
  {summary&&<>
   {!explore&&<><div className="activity-totals"><div><span>Requests / selected period</span><strong>{summary.total_requests.toLocaleString()}</strong></div><div><span>Unique method + path</span><strong>{summary.unique_endpoints}</strong></div><div><span>Linked findings</span><strong>{summary.findings.reduce((sum,r)=>sum+r.count,0)}</strong></div></div>
    <section className="activity-chart"><div className="panel-heading"><h2>Request activity over time</h2><label>Interval<select aria-label="Activity interval" value={interval} onChange={e=>setInterval(e.target.value)}><option value="1">1 minute</option><option value="5">5 minutes</option><option value="60">1 hour</option></select></label></div>
    {summary.series.length?<div className="traffic-chart" role="img" aria-label={`All ${summary.total_requests} filtered requests, aggregated on the server`}><Line data={{labels:summary.series.map(row=>stamp(row.timestamp)),datasets:[{label:'Observed requests',data:summary.series.map(row=>row.count),borderColor:'#8cdbac',borderWidth:1.5,pointRadius:summary.series.length>50?0:2,tension:.15}]}} options={{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#a2afa8',maxTicksLimit:5,maxRotation:0}},y:{beginAtZero:true,ticks:{precision:0,color:'#a2afa8'},grid:{color:'#ffffff12'}}}}}/></div>:<p className="workflow-empty">No requests in this period. Change the range or connect the controlled demo.</p>}<small>Adaptive buckets: {summary.bucket_seconds} seconds. No invented zero-traffic intervals.</small></section>
    <div className="activity-columns"><section><div className="panel-heading"><h2>Activity breakdown</h2><select aria-label="Group traffic by" value={group} onChange={e=>setGroup(e.target.value)}><option value="endpoint">By endpoint</option><option value="caller">By caller</option><option value="status">By HTTP response</option><option value="interval">By time interval</option></select></div><ol className="activity-bars">{summary.groups.map(row=><li key={row.label}><span>{group==='interval'?stamp(new Date(Number(row.label)*1000).toISOString()):row.label}</span><b>{row.count}</b><i style={{width:`${summary.total_requests?row.count/summary.total_requests*100:0}%`}}/></li>)}</ol><small>Top 10 groups in the filtered dataset.</small></section>
     <section><h2>Response distribution</h2><ul className="compact-facts">{summary.responses.map(row=><li key={row.status_code}><span>HTTP {row.status_code}</span><b>{row.count}</b></li>)}</ul><h2>Suspicious activity</h2><ul className="compact-facts">{summary.findings.map(row=><li key={row.detector}><span>{row.detector.replace(/_/g,' ')}</span><b>{row.count}</b></li>)}</ul>{!summary.findings.length&&<p>No linked findings for these requests.</p>}<small>Counts unique persisted alerts linked to requests in this period; historical unlinked alerts are excluded.</small></section>
    </div><details className="active-endpoints"><summary>Most active endpoints</summary><ol className="compact-facts">{summary.most_active.map(row=><li key={row.method+row.endpoint}><code>{row.method} {row.endpoint}</code><b>{row.count}</b></li>)}</ol></details></>}
   <div className="panel-heading"><h2>{explore?'Request ledger':'Recent requests'}</h2><Link className="text-link" href={explore?'/command-center/traffic':'/command-center/traffic?explore=true&page=1'}>{explore?'← Activity summary':'Explore requests ↗'}</Link></div>
   {explore&&<div className="table-toolbar"><select aria-label="Sort requests" value={sort} onChange={e=>{setSort(e.target.value);resetPage()}}><option value="time">Observation time</option><option value="endpoint">Endpoint path</option><option value="status">HTTP response</option></select><select aria-label="Request sort order" value={order} onChange={e=>{setOrder(e.target.value);resetPage()}}><option value="desc">Descending</option><option value="asc">Ascending</option></select></div>}
   <Requests rows={explore?(ledger?.page===page?ledger.items:[]):summary.recent}/>
   {explore&&ledger&&<nav className="request-pagination" aria-label="Request pagination"><Link aria-disabled={page<=1} tabIndex={page<=1?-1:0} className={page<=1?'disabled-link':''} href={`/command-center/traffic?explore=true&page=${Math.max(1,page-1)}`}>← Previous</Link><span>Page {page} of {Math.max(1,Math.ceil(ledger.total/25))} · {ledger.total} requests</span><Link aria-disabled={page*25>=ledger.total} tabIndex={page*25>=ledger.total?-1:0} className={page*25>=ledger.total?'disabled-link':''} href={`/command-center/traffic?explore=true&page=${page+1}`}>Next →</Link></nav>}
   <p className="table-note">Exact persisted timestamps and investigation links are retained. Summary and ledger are queried on the server, not a hidden full-history download. Updated {stamp(summary.evaluated_at)}.</p>
  </>}
 </section>
}
