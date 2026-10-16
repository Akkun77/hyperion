import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSync} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {renderToStaticMarkup} from 'react-dom/server'
const require=createRequire(import.meta.url)
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/components/BrandReveal.tsx',import.meta.url))],bundle:true,platform:'node',format:'cjs',external:['react','react/jsx-runtime'],loader:{'.css':'empty'},write:false}).outputFiles[0].text
function fixture(reduced=false){
 const effects=[],timers=new Map(),events=new Map();let next=0,finished=0
 const hooks={useRef:value=>({current:value}),useState:value=>[value,()=>{}],useCallback:fn=>fn,useEffect:fn=>effects.push(fn)}
 const module={exports:{}}
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>name==='react'?hooks:require(name),
  window:{matchMedia:()=>({matches:reduced}),setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)},
  document:{documentElement:{dataset:{}}}})
 const element=module.exports.default({onComplete:()=>finished++})
 const cleanup=effects.map(effect=>effect()).filter(Boolean)
 return {element,timers,events,get finished(){return finished},cleanup:()=>cleanup.forEach(fn=>fn())}
}
test('intro uses the existing loop at large scale, with explicit Skip and honest decorative labeling',()=>{
 const s=fixture(),html=renderToStaticMarkup(s.element)
 assert.ok(html.includes('intro-loop-canvas'));assert.ok(html.includes('loop-trace'));assert.ok(html.includes('Skip introduction'))
 assert.ok(html.includes('Brand introduction · not network loading'));assert.ok(!html.includes('progressbar'))
 const css=readFileSync(new URL('../src/components/brand-introduction.css',import.meta.url),'utf8')
 assert.ok(css.includes('clamp(260px,36vw,440px)'))
 assert.ok(css.includes('hyperion-opening-exit .45s 2.3s'))
 s.cleanup()
})
test('only the outer completion animation finishes the 2.75-second intro, once',()=>{
 const s=fixture(),target={}
 const end=s.element.props.onAnimationEnd
 end({target:{},currentTarget:target,animationName:'hyperion-opening-exit'});assert.equal(s.finished,0)
 end({target,currentTarget:target,animationName:'brand-text-in'});assert.equal(s.finished,0)
 end({target,currentTarget:target,animationName:'hyperion-opening-exit'});assert.equal(s.finished,1)
 const fallback=[...s.timers.values()][0];assert.equal(fallback.ms,3500);fallback.fn();assert.equal(s.finished,1)
 s.cleanup();assert.equal(s.timers.size,0);assert.equal(s.events.size,0)
})
test('Skip, Escape, reduced motion and canceled/unmounted timers are functional',()=>{
 const skip=fixture();skip.element.props.children.at(-1).props.onClick();assert.equal(skip.finished,1);skip.cleanup()
 const escape=fixture();escape.events.get('keydown')({key:'Escape'});assert.equal(escape.finished,1);escape.cleanup()
 const reduced=fixture(true),timer=[...reduced.timers.values()][0];assert.equal(timer.ms,600);timer.fn();assert.equal(reduced.finished,1);reduced.cleanup()
 const unmounted=fixture();unmounted.cleanup();assert.equal(unmounted.timers.size,0);assert.equal(unmounted.events.size,0)
})
test('production routing excludes the rejected emblem and keeps one session-scoped introduction',()=>{
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8'),landing=readFileSync(new URL('../src/pages/Landing.tsx',import.meta.url),'utf8')
 assert.ok(!app.includes('EmblemPreview'));assert.ok(!app.includes('/emblem-preview'))
 assert.ok(!landing.includes('hero-composition.css'));assert.ok(!landing.includes('hero-visual'))
 assert.ok(app.includes("sessionStorage.getItem('hyperion-initialized')"));assert.ok(!app.includes("addEventListener('pointerdown'"))
})
