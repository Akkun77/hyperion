import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildSync } from 'esbuild'
import { fileURLToPath } from 'node:url'

const source = readFileSync(new URL('../src/graphics/environment.ts', import.meta.url), 'utf8')
const code = buildSync({entryPoints:[fileURLToPath(new URL('../src/graphics/environment.ts',import.meta.url))],bundle:true,format:'esm',write:false}).outputFiles[0].text
const { createEnvironment } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

function setup({ supported = true, reduced = false } = {}) {
  let next = 1
  const queue = new Map()
  const windowEvents = new Map(), documentEvents = new Map(), mediaEvents = new Map()
  const deleted = { shader: 0, program: 0, buffer: 0 }
  let draws = 0
  const media = { matches: reduced, addEventListener: (key, fn) => mediaEvents.set(key, fn), removeEventListener: key => mediaEvents.delete(key) }
  globalThis.window = { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 3, matchMedia: () => media, addEventListener: (key, fn) => windowEvents.set(key, fn), removeEventListener: key => windowEvents.delete(key) }
  globalThis.document = { hidden: false, addEventListener: (key, fn) => documentEvents.set(key, fn), removeEventListener: key => documentEvents.delete(key) }
  globalThis.requestAnimationFrame = fn => { const id = next++; queue.set(id, fn); return id }
  globalThis.cancelAnimationFrame = id => queue.delete(id)
  let disconnected = false, resize = () => {}
  globalThis.ResizeObserver = class { constructor(callback) { resize = callback } observe() {} disconnect() { disconnected = true } }
  const gl = new Proxy({
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}),
    getShaderParameter: () => true, getProgramParameter: () => true,
    getAttribLocation: () => 0, getUniformLocation: () => ({}),
    deleteShader: () => deleted.shader++, deleteProgram: () => deleted.program++, deleteBuffer: () => deleted.buffer++,
    drawArrays: () => draws++,
  }, { get: (target, key) => key in target ? target[key] : key.toString().toUpperCase() === key ? 1 : () => {} })
  const canvasEvents = new Map()
  const canvas = { dataset: {}, getContext: () => supported ? gl : null, getBoundingClientRect: () => ({ width: 1000, height: 800 }), addEventListener: (key, fn) => canvasEvents.set(key, fn), removeEventListener: key => canvasEvents.delete(key) }
  const step = time => { const pending = [...queue.values()]; queue.clear(); pending.forEach(fn => fn(time)) }
  return { canvas, queue, step, resize: () => resize(), documentEvents, canvasEvents, windowEvents, mediaEvents, deleted, get draws() { return draws }, get disconnected() { return disconnected } }
}

test('WebGL animates over time with no input and caps pixel ratio', () => {
  const s = setup(); const modes = []
  const dispose = createEnvironment(s.canvas, mode => modes.push(mode))
  for (let i=1; i<20; i++) s.step(i*20)
  assert.equal(s.canvas.dataset.motion, 'animated')
  assert.ok(Number(s.canvas.dataset.frames) > 10)
  assert.equal(s.canvas.width, 1500)
  assert.equal(modes.at(-1), 'webgl')
  document.hidden = true; s.documentEvents.get('visibilitychange')()
  assert.equal(s.queue.size, 0)
  document.hidden = false; s.documentEvents.get('visibilitychange')()
  assert.equal(s.queue.size, 1)
  dispose()
  assert.equal(s.queue.size, 0)
  assert.equal(s.documentEvents.size, 0)
  assert.equal(s.windowEvents.size, 0)
  assert.equal(s.mediaEvents.size, 0)
  assert.deepEqual(s.deleted, { shader: 2, program: 1, buffer: 1 })
  assert.ok(s.disconnected)
})

test('OS reduced motion renders one static frame with no continuing loop', () => {
  const s = setup({ reduced: true })
  const dispose = createEnvironment(s.canvas, () => {})
  s.step(20)
  assert.equal(s.canvas.dataset.motion, 'reduced')
  assert.equal(s.draws, 1)
  assert.equal(s.queue.size, 0)
  dispose()
})

test('stationary preview redraws after a resize clears its drawing buffer', () => {
  const s = setup()
  const dispose = createEnvironment(s.canvas, () => {}, true, true)
  s.step(20)
  assert.equal(s.draws, 1)
  assert.equal(s.queue.size, 0)
  s.resize()
  assert.equal(s.queue.size, 1)
  s.step(40)
  assert.equal(s.draws, 2)
  assert.equal(s.queue.size, 0)
  dispose()
})

test('explicit reduced motion renders once even when OS allows animation', () => {
  const s = setup()
  const dispose = createEnvironment(s.canvas, () => {}, true)
  s.step(20)
  assert.equal(s.canvas.dataset.motion, 'reduced')
  assert.equal(s.queue.size, 0)
  dispose()
})

test('unavailable WebGL uses fallback without scheduling a render loop', () => {
  const s = setup({ supported: false }); const modes = []
  createEnvironment(s.canvas, mode => modes.push(mode))()
  assert.deepEqual(modes, ['fallback'])
  assert.equal(s.queue.size, 0)
})

test('context loss switches to fallback and cancels pending work', () => {
  const s = setup(); const modes = []
  const dispose = createEnvironment(s.canvas, mode => modes.push(mode))
  let prevented = false
  s.canvasEvents.get('webglcontextlost')({ preventDefault: () => { prevented = true } })
  assert.ok(prevented)
  assert.equal(modes.at(-1), 'fallback')
  assert.equal(s.queue.size, 0)
  dispose()
})
test('observed batches drive separate shader accents and disconnection cancels them',()=>{
 const s=setup();const dispose=createEnvironment(s.canvas,()=>{})
 s.windowEvents.get('hyperion-observation')({detail:{signals:[{kind:'finding',severity:'critical'}]}})
 assert.equal(s.canvas.dataset.signalBatches,'1');assert.equal(s.canvas.dataset.signalTone,'3')
 s.windowEvents.get('hyperion-observation')({detail:{signals:[]}})
 assert.equal(s.canvas.dataset.signalBatches,'1')
 s.windowEvents.get('hyperion-observation')({detail:{disconnected:true,signals:[]}})
 s.step(20);dispose();assert.equal(s.windowEvents.size,0)
})
test('reduced motion never queues event accent animation',()=>{
 const s=setup({reduced:true});const dispose=createEnvironment(s.canvas,()=>{})
 s.windowEvents.get('hyperion-observation')({detail:{signals:[{kind:'traffic'}]}})
 assert.equal(s.canvas.dataset.signalBatches,undefined)
 s.step(20);assert.equal(s.queue.size,0);dispose()
})
