import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'

const code = transformSync(readFileSync(new URL('../src/hooks/useSecurityData.ts', import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code
function mount({hidden=false, immediate=false}={}) {
 const states=[],effects=[],timers=new Map(),listeners=new Map(),signals=[]
 let stateIndex=0,next=1,fail=false,calls=0
 const api=new Proxy({}, {get:()=> (...args)=>{
   calls++; const signal=args.at(-1); signals.push(signal)
   if(fail && calls%6===1) return Promise.reject(new Error('service unavailable'))
   return immediate && !fail ? Promise.resolve({status:'ok'}) : new Promise(()=>{})
 }})
 const document={hidden, addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)}
 const window={setTimeout:(fn,delay)=>{const id=next++;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id)}
 const module={exports:{}}
 const react={useState:value=>{const i=stateIndex++;states[i]=value;return [value,v=>{states[i]=v}]},useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)}
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>name==='react'?react:{__esModule:true,default:api},document,window,AbortController,Date,Error,console})
 const hook=module.exports.useSecurityData()
 const cleanup=effects[0]()
 return {hook,cleanup,document,listeners,timers,states,signals,get calls(){return calls},fail:()=>{fail=true}}
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve))}
test('polling deduplicates refresh while busy and aborts/cleans up on unmount',async()=>{
 const s=mount()
 assert.equal(s.calls,6)
 s.hook.refresh();s.hook.refresh()
 assert.equal(s.calls,6)
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
 assert.equal(s.calls,12)
 assert.ok(s.signals.slice(6).every(signal=>signal.aborted))
 assert.equal(s.states[0],snapshot)
 assert.equal(s.states[1],'service unavailable')
 assert.equal([...s.timers.values()].filter(timer=>timer.delay===5000).length,1)
 s.cleanup()
})
test('hidden workspace suspends polling and visible refresh does not duplicate a batch',()=>{
 const s=mount({hidden:true})
 assert.equal(s.calls,0)
 s.document.hidden=false;s.listeners.get('visibilitychange')()
 assert.equal(s.calls,6)
 s.listeners.get('visibilitychange')()
 assert.equal(s.calls,6)
 s.cleanup()
})
