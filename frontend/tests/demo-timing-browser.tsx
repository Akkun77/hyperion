// Development-only browser audit of the actual component, not a production route.
// Evidence fields were read from existing event #838 / finding #11; the run envelope
// is a fixture. No backend request is sent and no database records are created.
import React from 'react'
import {createRoot} from 'react-dom/client'
import WatchHyperionWork from '../src/workspace/WatchHyperionWork'
import type {DemoResult} from '../src/workspace/productApi'
import '../src/index.css'
import '../src/workspace/design-foundation.css'
import '../src/workspace/unified-workspace.css'
import '../src/workspace/product-workflows.css'
const names=['Incoming Edge Request','API Endpoint Resolution','Traffic Log Persistence','Security Engine Evaluation','Alert Creation & Classification','Risk Intelligence Update','Forensic Evidence Trace']
const fixture:DemoResult={
 run_id:'recorded-evidence-838-fixture',scenario:'bola',source:'Recorded test fixture',execution:'Previously completed',presentation:'Recorded replay',
 request_count:1,event_ids:[838],response_statuses:[200],
 selected_request:{id:838,timestamp:'2026-10-16T02:19:50.180027+05:30',method:'GET',endpoint:'/api/v1/users/{id}',caller_ip:'198.18.113.191',user_id:'user_101',target_resource_id:'user_202',token:null,auth_type:'Bearer Token',payload_size_bytes:0,status_code:200},
 findings:[{alert_id:'11',alert_type:'bola',severity:'CRITICAL',description:'Authorization denied but request succeeded with status 200.',related_event_id:838}],detector_result:'BOLA detected',
 flow:{has_data:true,selected_alert_id:'11',selected_event_id:838,available_events:[],stages:names.map((name,i)=>({step:i+1,id:`recorded-${i+1}`,name,status:'recorded',summary:name,meta:i===5?{'Endpoint Score':'85 / 100'}:i===6?{'Linked Traffic ID':838,'Linked Alert ID':'11'}:{'Recorded event':838}}))}
}
let responses=0
let stageSignals=0
window.addEventListener('hyperion-demo-stage',()=>{document.querySelector('#signal-count')!.textContent=String(++stageSignals)})
setInterval(()=>{document.querySelector('#browser-clock')!.textContent=performance.now().toFixed(1)},100)
window.fetch=async()=>{
 await new Promise(resolve=>setTimeout(resolve,2000))
 document.querySelector('#response-count')!.textContent=String(++responses)
 return new Response(JSON.stringify(fixture),{status:200,headers:{'Content-Type':'application/json'}})
}
let previousStage='',previousTime=0
new MutationObserver(()=>{
 const stage=document.querySelector('.demonstration-view')?.getAttribute('data-stage') || ''
 if(stage===previousStage)return
 const now=performance.now()
 const row=document.createElement('tr')
 for(const value of [stage||'setup',now.toFixed(1),previousStage?(now-previousTime).toFixed(1):'—']){
  const cell=document.createElement('td');cell.textContent=value;cell.style.padding='4px 12px';row.append(cell)
 }
 document.querySelector('#timing-log')!.append(row)
 previousStage=stage;previousTime=now
}).observe(document.querySelector('#root')!,{subtree:true,childList:true,attributes:true,attributeFilter:['data-stage']})
createRoot(document.querySelector('#root')!).render(<React.StrictMode><WatchHyperionWork/></React.StrictMode>)
