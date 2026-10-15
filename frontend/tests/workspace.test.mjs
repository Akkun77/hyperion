import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
const source = readFileSync(new URL('../src/workspace/filters.ts', import.meta.url), 'utf8')
const code = transformSync(source, { loader:'ts', format:'esm' }).code
const { filterTraffic, trafficBuckets, findingIsNew } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const now = Date.parse('2026-10-15T12:00:00Z')
const rows = [
 {id:1, endpoint:'/users', method:'GET', caller_ip:'192.0.2.1', user_id:'alice', status_code:200, timestamp:'2026-10-15T11:50:00Z'},
 {id:2, endpoint:'/payments', method:'POST', caller_ip:null, user_id:null, status_code:403, timestamp:'2026-10-14T11:50:00Z'},
 {id:3, endpoint:'/users', method:'GET', caller_ip:'192.0.2.2', status_code:500, timestamp:'2026-10-15T11:59:00Z'},
]
const all = {search:'',method:'all',status:'all',range:'all'}
test('traffic search, method and response filters combine without mutating data',()=>{
 assert.deepEqual(filterTraffic(rows,{...all,search:' ALICE ',method:'GET',status:'2'},now).map(r=>r.id),[1])
 assert.deepEqual(filterTraffic(rows,{...all,status:'5'},now).map(r=>r.id),[3])
 assert.equal(rows.length,3)
})
test('time range uses full timestamp, includes boundaries and rejects future/invalid times',()=>{
 assert.deepEqual(filterTraffic(rows,{...all,range:'15'},now).map(r=>r.id),[1,3])
 assert.equal(filterTraffic([{...rows[0],timestamp:new Date(now-15*60000).toISOString()}],{...all,range:'15'},now).length,1)
 for(const timestamp of ['invalid','2026-10-15T12:01:00Z']) assert.equal(filterTraffic([{...rows[0],timestamp}],{...all,range:'15'},now).length,0)
})
test('chart separates calendar days and sorts chronologically',()=>{
 const buckets=trafficBuckets(rows)
 assert.equal(buckets.length,3)
 assert.equal(buckets[0][0],Date.parse('2026-10-14T11:50:00Z'))
 assert.equal(buckets.reduce((sum,[,n])=>sum+n,0),3)
})
test('finding arrival means after inbox opening, not severity or evidence presence',()=>{
 assert.equal(findingIsNew('2026-10-15T12:00:01Z',now),true)
 assert.equal(findingIsNew('2026-10-15T12:00:00Z',now),false)
 assert.equal(findingIsNew('invalid',now),false)
})
