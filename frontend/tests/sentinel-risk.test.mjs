import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSync} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const require=createRequire(import.meta.url)
function load(file){
 const code=buildSync({entryPoints:[fileURLToPath(new URL(file,import.meta.url))],bundle:true,platform:'node',format:'cjs',external:['react','react/jsx-runtime'],write:false}).outputFiles[0].text
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require});return module.exports
}
const {default:RecordedRisk,recordedRisk}=load('../src/workspace/RecordedRisk.tsx')
const {buildSentinelGeometry}=load('../src/graphics/sentinelGeometry.ts')
const flow=raw=>({stages:[{id:'risk-recalculation',meta:{'Endpoint Score':raw,'Exposure Severity':'HIGH','Primary Driver':'["BOLA breach (+30)","Token replay (+20)"]'}}]})
test('risk UI renders recorded 85 and its actual factors, not the old invented 55',()=>{
 const html=renderToStaticMarkup(React.createElement(RecordedRisk,{flow:flow('85 / 100')}))
 assert.ok(html.includes('85 / 100'));assert.ok(html.includes('HIGH'));assert.ok(html.includes('Token replay (+20)'));assert.ok(!html.includes('55 / 100'))
 const watch=readFileSync(new URL('../src/workspace/WatchHyperionWork.tsx',import.meta.url),'utf8')
 assert.equal((watch.match(/<RecordedRisk flow=\{result.flow\}/g)||[]).length,2)
 assert.ok(!watch.includes('55 / 100'))
})
test('risk 0 is valid; absent, malformed and out-of-range scores are Not available',()=>{
 assert.equal(recordedRisk(flow(0)).score,0)
 for(const raw of [null,undefined,'',-1,101,'NaN','85 bananas','Infinity',false])assert.equal(renderToStaticMarkup(React.createElement(RecordedRisk,{flow:flow(raw)})),'<span>Not available</span>')
 assert.equal(renderToStaticMarkup(React.createElement(RecordedRisk,{})),'<span>Not available</span>')
})
test('homepage illustrations without a backend execution never invent endpoint risk scores or weights',()=>{
 for(const name of ['HomepageDemoPreview','ContinuousSecurityStory']){
  const source=readFileSync(new URL(`../src/components/${name}.tsx`,import.meta.url),'utf8')
  assert.ok(!source.includes('55 / 100'))
  assert.ok(source.includes("'Dynamic Risk Score': 'Not available'"))
  assert.ok(!source.includes('+30 (BOLA'))
 }
})
test('Sentinel is three independent finite solid blade meshes with a genuine open center',()=>{
 const mesh=buildSentinelGeometry(32), {vertices:v,bladeRanges:ranges}=mesh
 assert.equal(ranges.length,3);assert.ok(ranges.every(r=>r.count===ranges[0].count));assert.equal(v.length%21,0)
 let body=0,channel=0
 for(let i=0;i<v.length;i+=7){
  assert.ok(Array.from(v.slice(i,i+7)).every(Number.isFinite))
  assert.ok(Math.hypot(v[i],v[i+1])>.65,'triangular aperture remains open')
  assert.ok(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5)
  if(v[i+6]===1)channel++;else body++
 }
 assert.ok(body>channel&&channel>0)
 // Identical solid geometry is rotated exactly 120 degrees for each blade.
 const offset=ranges[1].start*7,angle=Math.PI*2/3
 for(let i=0;i<ranges[0].count*7;i+=7){
  assert.ok(Math.abs(v[offset+i]-(v[i]*Math.cos(angle)-v[i+1]*Math.sin(angle)))<1e-6)
  assert.ok(Math.abs(v[offset+i+1]-(v[i]*Math.sin(angle)+v[i+1]*Math.cos(angle)))<1e-6)
 }
})
