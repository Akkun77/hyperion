import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const code=transformSync(readFileSync(new URL('../src/workspace/liveSignal.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code
const {emptySignalState,reconcileSignals,pulseTone,observedTime}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const now=Date.parse('2026-10-16T12:00:00Z')
const event=(id,stamp=now+1000)=>({id,method:'GET',endpoint:'/api/users',timestamp:new Date(stamp).toISOString(),status_code:200})
const snapshot=(traffic=[],alerts=[],inventory=[],risk=[])=>({traffic,alerts,inventory,risk,kpis:{total_requests_observed:traffic.length}})
test('historical baseline and identical responses do not pulse',()=>{
 const data=snapshot([event(1,now-10000)])
 const state=reconcileSignals(emptySignalState(),data,now)
 assert.equal(state.revision,0);assert.equal(state.recent[0].historical,true)
 assert.equal(reconcileSignals(state,data,now+5000).revision,0)
})
test('new identifiable traffic pulses once; late historical imports never pulse',()=>{
 const state=reconcileSignals(emptySignalState(),snapshot([event(1,now-1000)]),now)
 const data=snapshot([event(3,now-50000),event(2),event(1,now-1000)])
 const next=reconcileSignals(state,data,now+5000)
 assert.deepEqual(next.batch.map(row=>row.key),['traffic:2'])
 assert.equal(reconcileSignals(next,data,now+10000).batch.length,0)
 assert.equal(next.revision,1)
})
test('connection recovery renews baseline without replaying missed activity',()=>{
 const state={...reconcileSignals(emptySignalState(),snapshot(),now),suspended:true}
 const next=reconcileSignals(state,snapshot([event(10)]),now+5000)
 assert.equal(next.revision,0);assert.equal(next.batch.length,0);assert.match(next.note,/restored/)
 const after=reconcileSignals(next,snapshot([event(11,now+6000),event(10)]),now+10000)
 assert.equal(after.revision,1)
})
test('findings, shadow discovery and risk differences retain actual evidence references',()=>{
 const base=snapshot([],[],[],[{target_id:'GET /api/users',score:12}])
 const state=reconcileSignals(emptySignalState(),base,now)
 const data=snapshot([event(1)],[{alert_id:'1',alert_type:'bola',severity:'critical',timestamp:new Date(now+1000).toISOString()}],[{id:7,method:'GET',endpoint:'/shadow',is_shadow:true,last_seen:new Date(now+1000).toISOString()}],[{target_id:'GET /api/users',score:68}])
 const next=reconcileSignals(state,data,now+5000)
 assert.deepEqual(next.batch.map(row=>row.kind),['finding','shadow','risk','traffic'])
 assert.match(next.batch[0].href,/alert=1/);assert.match(next.batch[1].href,/endpoint=7/)
 assert.equal(pulseTone(next.batch),3);assert.equal(pulseTone(next.batch.slice(1)),2)
 assert.equal(reconcileSignals(next,data,now+10000).revision,1)
})
test('high volume remains bounded and does not replay IDs that leave the window',()=>{
 const state=reconcileSignals(emptySignalState(),snapshot(),now)
 const traffic=Array.from({length:1000},(_,i)=>event(i+1))
 const next=reconcileSignals(state,snapshot(traffic),now+5000)
 assert.equal(next.batch.length,24);assert.equal(next.recent.length,18)
 assert.equal(reconcileSignals(next,snapshot(traffic),now+10000).revision,1)
})
test('empty streams, counter rollback and UTC parsing are safe',()=>{
 const state=reconcileSignals(emptySignalState(),snapshot(),now)
 assert.equal(state.recent.length,0)
 assert.equal(observedTime('2026-10-16T12:00:00'),now)
 assert.equal(observedTime('2026-10-16T17:30:00+05:30'),now)
 const loaded=reconcileSignals(state,snapshot([event(5)]),now+5000)
 assert.equal(reconcileSignals(loaded,snapshot(),now+10000).batch.length,0)
})
test('favicon uses the same closed loop geometry rather than a generic H',async()=>{
 const loopCode=transformSync(readFileSync(new URL('../src/graphics/loop.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code
 const {loopEmblemPath}=await import(`data:text/javascript;base64,${Buffer.from(loopCode).toString('base64')}`)
 assert.ok(readFileSync(new URL('../public/hyperion.svg',import.meta.url),'utf8').includes(loopEmblemPath()))
})
test('old arrivals after a long hidden interval are not presented as live',()=>{
 const state=reconcileSignals(emptySignalState(),snapshot(),now)
 const next=reconcileSignals(state,snapshot([event(1,now+1000)]),now+60000)
 assert.equal(next.revision,0);assert.equal(next.batch.length,0)
})
