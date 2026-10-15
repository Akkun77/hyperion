import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import vm from 'node:vm'
import {buildSync} from 'esbuild'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const require=createRequire(import.meta.url)
function bundle(file,extra={}) {
 const code=buildSync({entryPoints:[fileURLToPath(new URL(file,import.meta.url))],bundle:true,format:'cjs',platform:'node',external:['react','react/jsx-runtime'],write:false}).outputFiles[0].text
 const module={exports:{}}
 vm.runInNewContext(code,{module,exports:module.exports,require,URL,console,Date,...extra})
 return module.exports
}
function router(){
 const pushed=[]
 const window={location:{href:'http://127.0.0.1:5176/',origin:'http://127.0.0.1:5176'},history:{pushState:(_,__,href)=>pushed.push(href)},dispatchEvent:()=>{},scrollTo:()=>{}}
 const {Link}=bundle('../src/router.tsx',{window,PopStateEvent:class {}})
 const click=(props,overrides={})=>{const event={button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...overrides};Link(props).props.onClick(event);return event}
 return {click,pushed}
}
test('actual Link intercepts internal clicks but respects modified and external navigation',()=>{
 const s=router();assert.equal(s.click({href:'/command-center'}).defaultPrevented,true)
 for (const props of [{href:'https://example.com/'},{href:'/command-center',target:'_blank'},{href:'/report',download:''},{href:'#main'}]) assert.equal(s.click(props).defaultPrevented,false)
 assert.equal(s.click({href:'/command-center'},{ctrlKey:true}).defaultPrevented,false)
 assert.deepEqual(s.pushed,['/command-center'])
})
test('actual signal visualization never mounts an event pulse on idle or reconnect',()=>{
 const {default:Signal}=bundle('../src/workspace/SignalObservatory.tsx')
 const base={revision:3,batch:[],recent:[],note:'Baseline renewed'}
 const idle=renderToStaticMarkup(React.createElement(Signal,{state:base,disconnected:false}))
 assert.ok(!idle.includes('class="signal-observation'))
 const fresh={...base,batch:[{kind:'finding',severity:'critical'}]}
 assert.ok(renderToStaticMarkup(React.createElement(Signal,{state:fresh,disconnected:false})).includes('signal-tone-3'))
 assert.ok(!renderToStaticMarkup(React.createElement(Signal,{state:fresh,disconnected:true})).includes('class="signal-observation'))
})
