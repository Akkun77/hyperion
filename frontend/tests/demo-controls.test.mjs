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
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/workspace/DemoPlaybackControls.tsx',import.meta.url))],bundle:true,platform:'node',format:'cjs',external:['react','react/jsx-runtime'],write:false}).outputFiles[0].text
const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require})
const Controls=module.exports.default
test('actual controls render exactly Previous, Play/Pause, Next and Replay in one row',()=>{
 const calls=[],controller={goTo:n=>calls.push(n),resume:()=>calls.push('play'),pause:()=>calls.push('pause'),replay:()=>calls.push('replay')}
 const props={stage:1,stageCount:7,playing:false,controller},element=Controls(props)
 const html=renderToStaticMarkup(React.createElement(Controls,props))
 assert.equal((html.match(/<button/g)||[]).length,4)
 assert.match(html,/>Previous<.*>Play<.*>Next<.*>Replay</)
 assert.ok(!html.includes('<select'));assert.ok(!html.includes('presentation duration'))
 element.props.children[0].props.onClick();element.props.children[1].props.onClick();element.props.children[2].props.onClick();element.props.children[3].props.onClick()
 Controls({...props,playing:true}).props.children[1].props.onClick()
 assert.deepEqual(calls,[0,'play',2,'replay','pause'])
})
test('stage boundaries disable navigation and evidence never resumes automatically',()=>{
 const controller={goTo(){},resume(){},pause(){},replay(){}}
 const first=Controls({stage:0,stageCount:7,playing:false,controller}).props.children
 assert.equal(first[0].props.disabled,true);assert.equal(first[1].props.disabled,false)
 const last=Controls({stage:6,stageCount:7,playing:false,controller}).props.children
 assert.equal(last[0].props.disabled,false);assert.equal(last[1].props.disabled,true);assert.equal(last[2].props.disabled,true);assert.equal(last[3].props.disabled,undefined)
})
test('Watch starts manually and shows a single recorded indicator only inside the stored-result branch',()=>{
 const source=readFileSync(new URL('../src/workspace/WatchHyperionWork.tsx',import.meta.url),'utf8')
 assert.ok(source.includes('controller.start(response.flow.stages.length)'))
 assert.equal((source.match(/<DemoPlaybackControls /g)||[]).length,1)
 assert.equal((source.match(/Recorded demo/g)||[]).length,1)
 assert.ok(source.indexOf('Recorded demo')>source.indexOf('data-run-id={result.run_id}'))
 for(const text of ['Playback speed','Guided playback','presentation duration','Recorded result — not backend processing time','stage-controls-footer','Replay recorded stages','Live luminous pulse','Ambient loop motion'])assert.ok(!source.includes(text),text)
})
