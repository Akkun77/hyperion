import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSync} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import vm from 'node:vm'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const require=createRequire(import.meta.url)
function load(file){
 const code=buildSync({entryPoints:[fileURLToPath(new URL(file,import.meta.url))],bundle:true,format:'cjs',platform:'node',external:['react','react/jsx-runtime','react-chartjs-2'],define:{'import.meta.env':'{}'},write:false}).outputFiles[0].text
 const module={exports:{}}
 vm.runInNewContext(code,{module,exports:module.exports,require,console,Date,URLSearchParams,window:{location:{search:''}}})
 return module.exports.default
}
const Connect=load('../src/workspace/ConnectAPI.tsx')
const Watch=load('../src/workspace/WatchHyperionWork.tsx')
const Hierarchy=load('../src/workspace/RiskHierarchy.tsx')
const Traffic=load('../src/workspace/CompactTraffic.tsx')
test('actual Connect workflow distinguishes registration from capture and requires explicit validation',()=>{
 const html=renderToStaticMarkup(React.createElement(Connect))
 for(const text of ['Connect API workflow','Import OpenAPI JSON','Built-in controlled demo','Validate connection','A submitted URL is not an active monitor','Registered connections'])assert.ok(html.includes(text),text)
 assert.ok(!html.includes('Register documented API'))
})
test('actual Watch experience requires explicit consent and never invents an initial execution',()=>{
 const html=renderToStaticMarkup(React.createElement(Watch))
 for(const text of ['Normal request','Scraping','Token misuse','BOLA','Shadow discovery','Run controlled scenario','Every API leaves a signal','CONTROLLED BOLA SCENARIO BRIEFING','Ambient loop motion is symbolic','I am authorized to run this controlled local demonstration.'])assert.ok(html.includes(text),text)
 assert.match(html,/<button[^>]+disabled=""[^>]*>Run controlled scenario/)
 assert.match(html,/<aside class="sculpture-caption-bar"[^>]*>[\s\S]*?Ambient loop motion is symbolic/)
 assert.match(html,/<label class="workflow-consent"[^>]*>[\s\S]*?I am authorized to run this controlled local demonstration\./)
 assert.ok(!html.includes('COMPLETED CONTROLLED LOCAL EXECUTION'))
 assert.ok(!html.includes('demo-stage-detail'))
})
test('actual hierarchy exposes the full progressive evidence path without auto-opening branches',()=>{
 const data={platform:{name:'Local platform',organization:'Authorized local API',risk_score:50,severity:'MEDIUM',total_services:1,total_endpoints:1,active_alerts_count:1,factors:['Measured score']},services:[{id:'users',name:'Identity service',risk_score:50,endpoint_count:1,alert_count:1,description:'Actual service',drivers:['One finding'],endpoints:[{id:7,method:'GET',endpoint:'/users/{id}',is_shadow:false,total_calls:2,risk_score:50,auth_type:'Bearer Token',last_seen:'2026-10-16T00:00:00Z',risk_reasons:['BOLA factor'],alerts:[{alert_id:'8',alert_type:'bola',severity:'HIGH',description:'Persisted finding',related_event_id:12}]}]}]}
 const html=renderToStaticMarkup(React.createElement(Hierarchy,{data}))
 assert.ok(html.includes('Platform to evidence hierarchy'))
 assert.ok(html.includes('BOLA factor'))
 assert.ok(html.includes('/command-center/investigation?alert=8'))
 assert.ok(html.includes('Request #12'))
 assert.ok(!/<details[^>]*\sopen(?:=|>)/.test(html))
})
test('actual Traffic mounts a compact empty loader, not a hidden full-history ledger',()=>{
 const html=renderToStaticMarkup(React.createElement(Traffic,{data:{traffic:[]}}))
 assert.ok(html.includes('Traffic time range'))
 assert.ok(html.includes('Awaiting activity summary'))
 assert.ok(!html.includes('<table'))
})
