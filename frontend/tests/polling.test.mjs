import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { buildSync } from 'esbuild'
import { fileURLToPath } from 'node:url'

const code = buildSync({entryPoints:[fileURLToPath(new URL('../src/hooks/useSecurityData.ts',import.meta.url))],bundle:true,external:['react','../api'],platform:'node',format:'cjs',write:false}).outputFiles[0].text
function mount({hidden=false, immediate=false}={}) {
 const states=[],effects=[],timers=new Map(),listeners=new Map(),signals=[]
 let stateIndex=0,next=1,fail=false,calls=0
 const fixture={health:{status:'ok'},getKPIs:{total_requests_observed:0},getInventory:[],getTrafficEvents:[],getSecurityAlerts:[],getRiskScores:[],getRiskHierarchy:{services:[]}}
 const events=[]
 const api=new Proxy({}, {get:(_,key)=> (...args)=>{
   calls++; const signal=args.at(-1); signals.push(signal)
   if(fail && calls%7===1) return Promise.reject(new Error('service unavailable'))
   return immediate && !fail ? Promise.resolve(fixture[key]) : new Promise(()=>{})
 }})
 const document={hidden, addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)}
 const window={setTimeout:(fn,delay)=>{const id=next++;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id),dispatchEvent:event=>events.push(event)}
 const module={exports:{}}
 const react={useState:value=>{const i=stateIndex++;states[i]=typeof value==='function'?value():value;return [states[i],v=>{states[i]=v}]},useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)}
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>name==='react'?react:{__esModule:true,default:api},document,window,AbortController,Date,Error,console,CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}}})
 const hook=module.exports.useSecurityData()
 const cleanup=effects[0]()
 return {hook,cleanup,document,listeners,timers,states,signals,events,fixture,get calls(){return calls},fail:()=>{fail=true},recover:()=>{fail=false}}
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve))}
test('polling deduplicates refresh while busy and aborts/cleans up on unmount',async()=>{
 const s=mount()
 assert.equal(s.calls,7)
 s.hook.refresh();s.hook.refresh()
 assert.equal(s.calls,7)
 s.cleanup()
 assert.ok(s.signals.every(signal=>signal.aborted))
 assert.equal(s.listeners.size,0)
 // The 12s request deadline must also be removed during cleanup.
 assert.equal(s.timers.size,0)
})
test('failed batch aborts siblings and retains the last successful snapshot',async()=>{
 const s=mount({immediate:true});await flush()
 const snapshot=s.states[0]
 assert.ok(snapshot)
 s.fail();s.hook.refresh();await flush()
 assert.equal(s.calls,14)
 assert.ok(s.signals.slice(7).every(signal=>signal.aborted))
 assert.equal(s.states[0],snapshot)
 assert.equal(s.states[1],'service unavailable')
 assert.equal([...s.timers.values()].filter(timer=>timer.delay===5000).length,1)
 s.cleanup()
})
test('hidden workspace suspends polling and visible refresh does not duplicate a batch',()=>{
 const s=mount({hidden:true})
 assert.equal(s.calls,0)
 s.document.hidden=false;s.listeners.get('visibilitychange')()
 assert.equal(s.calls,7)
 s.listeners.get('visibilitychange')()
 assert.equal(s.calls,7)
 s.cleanup()
})
test('real hook emits only a newly observed batch, never duplicate polls or reconnect catch-up',async()=>{
 const s=mount({immediate:true});await flush()
 assert.equal(s.events.length,0)
 s.fixture.getTrafficEvents=[{id:1,method:'GET',endpoint:'/business',timestamp:new Date(Date.now()+1).toISOString(),status_code:200}]
 s.fixture.getKPIs={total_requests_observed:1}
 s.hook.refresh();await flush()
 assert.equal(s.events.length,1)
 assert.equal(s.events[0].detail.signals[0].key,'traffic:1')
 s.hook.refresh();await flush();assert.equal(s.events.length,1)
 s.fail();s.hook.refresh();await flush();assert.equal(s.events.at(-1).detail.disconnected,true)
 s.fixture.getTrafficEvents=[{...s.fixture.getTrafficEvents[0],id:2}];s.fixture.getKPIs={total_requests_observed:2}
 s.recover();s.hook.refresh();await flush()
 assert.equal(s.events.filter(e=>e.detail.signals.length).length,1)
 s.cleanup()
})
