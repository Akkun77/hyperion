import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSync} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {renderToStaticMarkup} from 'react-dom/server'

const require=createRequire(import.meta.url)
function component(path) {
  const code=buildSync({entryPoints:[fileURLToPath(new URL(path,import.meta.url))],bundle:true,platform:'node',format:'cjs',external:['react','react/jsx-runtime'],loader:{'.css':'empty'},write:false}).outputFiles[0].text
  const module={exports:{}}
  vm.runInNewContext(code,{module,exports:module.exports,require,console})
  return module.exports.default
}

test('arrival renders Blender posters and immediate workspace links without a scene gate',()=>{
  const ArrivalPage=component('../src/visual/arrival/ArrivalPage.tsx')
  const html=renderToStaticMarkup(ArrivalPage({platform:false}))
  assert.ok(html.includes('/hyperion-2/posters/inspection-desktop.png'))
  assert.ok(html.includes('/hyperion-2/posters/inspection-mobile.png'))
  assert.ok(html.includes('See the system.'))
  assert.ok(html.includes('Illustrative system visualization') || html.includes('ILLUSTRATIVE SYSTEM VISUALIZATION'))
  assert.ok(html.includes('href="/command-center"'))
  assert.ok(html.includes('href="/command-center/gateway"'))
  assert.ok(!html.includes('<canvas'))
})

test('production route retires the old WebGL knot and timed brand overlay',()=>{
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
  const brand=readFileSync(new URL('../src/components/Brand.tsx',import.meta.url),'utf8')
  assert.ok(app.includes('ArrivalPage'))
  assert.ok(!app.includes('AnimatedEnvironment'))
  assert.ok(!app.includes('BrandReveal'))
  assert.ok(brand.includes('split-h-mark'))
  assert.ok(!brand.includes('loopEmblemPath'))
})
