import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSync} from 'esbuild'
import vm from 'node:vm'
import {fileURLToPath} from 'node:url'
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/workspace/demoPlayback.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text
const module={exports:{}}
vm.runInNewContext(code,{module,exports:module.exports})
const {DemoPlayback,DEMO_STAGE_DURATIONS}=module.exports
function fixture(){
 let time=0,id=0
 const pending=new Map(),all=new Map()
 const clock={now:()=>time,setTimeout:(fn,delay)=>{const key=++id;pending.set(key,{fn,at:time+delay});all.set(key,fn);return key},clearTimeout:key=>pending.delete(key)}
 const playback=new DemoPlayback(clock)
 const advance=ms=>{const target=time+ms;while(true){const next=[...pending.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>target)break;time=next[1].at;pending.delete(next[0]);next[1].fn()}time=target}
 return {playback,advance,pending,all}
}
test('exact presentation durations and indefinite evidence at normal speed',()=>{
 const {playback:p,advance,pending}=fixture()
 assert.deepEqual(Array.from(DEMO_STAGE_DURATIONS),[6000,6000,6000,9000,9000,8000,Infinity])
 p.start(7)
 for(let stage=0;stage<6;stage++){advance(DEMO_STAGE_DURATIONS[stage]-1);assert.equal(p.state.stage,stage);advance(1);assert.equal(p.state.stage,stage+1)}
 assert.equal(p.state.playing,false);assert.equal(pending.size,0)
 advance(24*60*60*1000);assert.equal(p.state.stage,6)
 p.resume();assert.equal(pending.size,0)
})
test('pause preserves remaining time; resume does not restart or skip a stage',()=>{
 const {playback:p,advance,pending}=fixture();p.start(7);advance(2500);p.pause()
 assert.equal(pending.size,0);advance(30000);assert.equal(p.state.stage,0)
 p.resume();advance(3499);assert.equal(p.state.stage,0);advance(1);assert.equal(p.state.stage,1)
})
test('manual navigation invalidates even a queued timer and waits indefinitely',()=>{
 const {playback:p,advance,all,pending}=fixture();p.start(7);advance(5999)
 const stale=[...all.values()][0];p.goTo(3);stale();advance(60000)
 assert.equal(p.state.stage,3);assert.equal(p.state.playing,false);assert.equal(pending.size,0)
 p.goTo(2);assert.equal(p.state.direction,'backward');p.resume();advance(5999);assert.equal(p.state.stage,2);advance(1);assert.equal(p.state.stage,3)
})
test('no result means no clock; replay resets stored playback only; exit/unmount cancel callbacks',()=>{
 const {playback:p,advance,pending,all}=fixture()
 p.resume();p.replay();advance(60000);assert.equal(pending.size,0)
 p.start(7);advance(1000);const stale=[...all.values()][0];p.replay();stale();advance(5999);assert.equal(p.state.stage,0);advance(1);assert.equal(p.state.stage,1)
 p.stop();advance(60000);assert.equal(p.state.playing,false);assert.equal(pending.size,0)
 p.start(7);p.dispose();assert.equal(pending.size,0)
})
test('speed changes preserve remaining presentation time and do not resume manual mode',()=>{
 const {playback:p,advance,pending}=fixture();p.start(7);advance(2000);p.setSpeed(1.5)
 advance(2666);assert.equal(p.state.stage,0);advance(1);assert.equal(p.state.stage,1)
 p.goTo(0);p.setSpeed(0.75);assert.equal(pending.size,0);p.resume();advance(7999);assert.equal(p.state.stage,0);advance(1);assert.equal(p.state.stage,1)
})
