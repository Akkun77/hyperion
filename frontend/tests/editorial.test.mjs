import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { buildSync, transformSync } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
async function load(path) {
 const code=transformSync(readFileSync(new URL(path,import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code
 return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const {selectFindings,detectionName}=await load('../src/workspace/findings.ts')
const {loopPoint,loopEmblemPath}=await load('../src/graphics/loop.ts')
const openedAt=Date.parse('2026-10-16T10:00:00Z')
const alerts=[
 {alert_id:'1',alert_type:'bola',severity:'critical',description:'Denied access succeeded',timestamp:'2026-10-16T09:00:00Z',related_event_ids:[7],detection_method:'authorization_analysis',recommended_action:'Review access'},
 {alert_id:'2',alert_type:'scraping',severity:'high',description:'Rate threshold exceeded',timestamp:'2026-10-16T10:01:00Z',related_event_ids:[],detection_method:'rate_analysis',recommended_action:'Review traffic'},
]
const traffic=[{id:7,method:'GET',endpoint:'/api/users',status_code:200,caller_ip:'192.0.2.1'}]
const all={search:'',severity:'all',category:'all',arrival:'all'}
test('editorial filters combine category, severity, arrival and real endpoint search',()=>{
 assert.deepEqual(selectFindings(alerts,traffic,{...all,category:'bola',severity:'critical',search:'/api/users'},openedAt).map(a=>a.alert_id),['1'])
 assert.deepEqual(selectFindings(alerts,traffic,{...all,arrival:'new'},openedAt).map(a=>a.alert_id),['2'])
 assert.equal(selectFindings(alerts,traffic,{...all,category:'scraping',search:'/api/users'},openedAt).length,0)
})
test('empty/unlinked and unknown detectors never invent evidence',()=>{
 assert.equal(selectFindings([],[],all,openedAt).length,0)
 assert.equal(detectionName('token_replay'),'Token misuse')
 assert.equal(detectionName('custom_detector'),'custom detector')
 assert.equal(selectFindings(alerts,[],{...all,search:'/api/users'},openedAt).length,0)
})
test('original loop emblem uses one finite closed centerline',()=>{
 const a=loopPoint(0),b=loopPoint(Math.PI*2)
 a.forEach((value,i)=>assert.ok(Math.abs(value-b[i])<1e-10))
 const path=loopEmblemPath()
 assert.ok(path.startsWith('M')&&path.endsWith(' Z'))
 assert.equal((path.match(/L/g)||[]).length,180)
 assert.ok(!path.includes('NaN'))
})
test('WebGL pulse uses local circular arc distance',()=>{
 const shader=readFileSync(new URL('../src/graphics/environment.ts',import.meta.url),'utf8')
 assert.ok(shader.includes('arcDistance=min(arcDistance,6.2831853-arcDistance)'))
 assert.ok(shader.includes('pulse=exp(-pow(arcDistance/.16,2.))'))
 assert.ok(shader.includes('vArc=u'))
})
const bundle=buildSync({entryPoints:[fileURLToPath(new URL('../src/workspace/ThreatFindings.tsx',import.meta.url))],bundle:true,format:'cjs',platform:'node',external:['react'],define:{'import.meta.env':'{}'},write:false,jsx:'automatic'}).outputFiles[0].text
const module={exports:{}}
vm.runInNewContext(bundle,{module,exports:module.exports,require:createRequire(import.meta.url),Date,console})
const ThreatFindings=module.exports.default
test('actual component renders endpoint, accessible expansion and Investigation link',()=>{
 const html=renderToStaticMarkup(React.createElement(ThreatFindings,{data:{alerts,traffic}}))
 assert.ok(html.includes('GET /api/users'))
 assert.ok(html.includes('aria-expanded="false"'))
 assert.ok(html.includes('aria-controls="finding-detail-1"'))
 assert.ok(html.includes('/command-center/investigation?alert=1'))
 assert.ok(html.includes('Endpoint not recorded'))
 assert.ok(!html.includes('<table'))
})
test('actual component renders honest empty state',()=>{
 const html=renderToStaticMarkup(React.createElement(ThreatFindings,{data:{alerts:[],traffic:[]}}))
 assert.ok(html.includes('No findings have been recorded'))
 assert.ok(html.includes('0 findings'))
})
