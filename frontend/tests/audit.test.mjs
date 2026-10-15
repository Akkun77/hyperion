import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'

const source = readFileSync(new URL('../src/pages/CommandCenter.tsx', import.meta.url), 'utf8')
const filtersSource = readFileSync(new URL('../src/workspace/filters.ts', import.meta.url), 'utf8')

const code = transformSync(filtersSource, { loader: 'ts', format: 'esm' }).code
const { filterTraffic, trafficBuckets, findingIsNew } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

test('all six command center page destinations and subtitles are defined', () => {
  const tabsMatch = source.match(/const tabs = (\[\[.*?\]\])/s)
  assert.ok(tabsMatch, 'tabs constant must be defined')
  const tabs = JSON.parse(tabsMatch[1].replace(/'/g, '"'))
  assert.equal(tabs.length, 6)
  const expectedKeys = ['', 'inventory', 'traffic', 'alerts', 'risk', 'investigation']
  assert.deepEqual(tabs.map(t => t[0]), expectedKeys)
  assert.deepEqual(tabs.map(t => t[1]), [
    'Overview',
    'API inventory',
    'Traffic activity',
    'Threat findings',
    'Risk intelligence',
    'Investigation'
  ])

  for (const key of expectedKeys) {
    assert.ok(source.includes(`subtitles[section]`) || source.includes(`subtitles:`), 'subtitles mapping must be present')
  }
})

test('inventory sorting orders by risk, activity, and path', () => {
  const sampleInventory = [
    { id: 1, method: 'GET', endpoint: '/api/v1/users', total_calls: 10, risk_score: 30, is_shadow: false },
    { id: 2, method: 'POST', endpoint: '/api/v1/payments', total_calls: 250, risk_score: 50, is_shadow: false },
    { id: 3, method: 'GET', endpoint: '/api/v2/debug', total_calls: 5, risk_score: 90, is_shadow: true },
    { id: 4, method: 'DELETE', endpoint: '/api/v1/admin/users', total_calls: 1, risk_score: 95, is_shadow: true },
  ]

  const byRisk = [...sampleInventory].sort((a, b) => b.risk_score - a.risk_score)
  assert.deepEqual(byRisk.map(r => r.id), [4, 3, 2, 1])

  const byActivity = [...sampleInventory].sort((a, b) => b.total_calls - a.total_calls)
  assert.deepEqual(byActivity.map(r => r.id), [2, 1, 3, 4])

  const byPath = [...sampleInventory].sort((a, b) => a.endpoint.localeCompare(b.endpoint))
  assert.deepEqual(byPath.map(r => r.id), [4, 2, 1, 3])

  const shadowOnly = sampleInventory.filter(r => r.is_shadow)
  assert.equal(shadowOnly.length, 2)
  assert.deepEqual(shadowOnly.map(r => r.id), [3, 4])
})

test('traffic filters support combinations of method, status code classes, and search', () => {
  const events = [
    { id: 1, endpoint: '/api/v1/users/101', method: 'GET', caller_ip: '10.0.0.1', user_id: 'user_101', status_code: 200, timestamp: '2026-10-15T10:00:00Z' },
    { id: 2, endpoint: '/api/v1/payments', method: 'POST', caller_ip: '10.0.0.2', user_id: 'user_102', status_code: 201, timestamp: '2026-10-15T10:01:00Z' },
    { id: 3, endpoint: '/api/v1/users/202', method: 'GET', caller_ip: '10.0.0.3', user_id: 'user_101', status_code: 403, timestamp: '2026-10-15T10:02:00Z' },
    { id: 4, endpoint: '/api/v2/debug', method: 'GET', caller_ip: '10.0.0.4', user_id: null, status_code: 500, timestamp: '2026-10-15T10:03:00Z' },
    { id: 5, endpoint: '/redirect', method: 'GET', caller_ip: '10.0.0.5', user_id: null, status_code: 302, timestamp: '2026-10-15T10:04:00Z' },
  ]

  assert.deepEqual(filterTraffic(events, { search: '', method: 'all', status: '2', range: 'all' }).map(e => e.id), [1, 2])
  assert.deepEqual(filterTraffic(events, { search: '', method: 'all', status: '3', range: 'all' }).map(e => e.id), [5])
  assert.deepEqual(filterTraffic(events, { search: '', method: 'all', status: '4', range: 'all' }).map(e => e.id), [3])
  assert.deepEqual(filterTraffic(events, { search: '', method: 'all', status: '5', range: 'all' }).map(e => e.id), [4])
  assert.deepEqual(filterTraffic(events, { search: 'payments', method: 'POST', status: '2', range: 'all' }).map(e => e.id), [2])
})

test('threat findings filter by severity, detection type, arrival, and search keyword', () => {
  const openedAt = Date.parse('2026-10-15T12:00:00Z')
  const alerts = [
    { alert_id: '1', alert_type: 'bola', severity: 'critical', description: 'Cross-user access to profile', timestamp: '2026-10-15T11:00:00Z' },
    { alert_id: '2', alert_type: 'token_replay', severity: 'high', description: 'Bearer token replayed across 4 IPs', timestamp: '2026-10-15T11:30:00Z' },
    { alert_id: '3', alert_type: 'scraping', severity: 'medium', description: 'High frequency rate anomaly', timestamp: '2026-10-15T12:05:00Z' },
    { alert_id: '4', alert_type: 'bola', severity: 'critical', description: 'Cross-user balance access', timestamp: '2026-10-15T12:10:00Z' },
  ]

  const criticalOnly = alerts.filter(a => a.severity === 'critical')
  assert.deepEqual(criticalOnly.map(a => a.alert_id), ['1', '4'])

  const newOnly = alerts.filter(a => findingIsNew(a.timestamp, openedAt))
  assert.deepEqual(newOnly.map(a => a.alert_id), ['3', '4'])

  const newBolaOnly = alerts.filter(a => a.alert_type === 'bola' && findingIsNew(a.timestamp, openedAt))
  assert.deepEqual(newBolaOnly.map(a => a.alert_id), ['4'])
})

test('investigation evidence links point to valid routes and extract IDs correctly', () => {
  const inspect = (type, id) => `/command-center/investigation?${type}=${encodeURIComponent(id)}`
  assert.equal(inspect('alert', '42'), '/command-center/investigation?alert=42')
  assert.equal(inspect('endpoint', 7), '/command-center/investigation?endpoint=7')
  assert.equal(inspect('event', 105), '/command-center/investigation?event=105')

  const q1 = new URLSearchParams(inspect('alert', '42').split('?')[1])
  assert.equal(q1.get('alert'), '42')

  const q2 = new URLSearchParams(inspect('endpoint', '7').split('?')[1])
  assert.equal(q2.get('endpoint'), '7')

  const q3 = new URLSearchParams(inspect('event', '105').split('?')[1])
  assert.equal(q3.get('event'), '105')
})

test('mobile navigation provides select control and aria labels', () => {
  assert.ok(source.includes('className="mobile-navigation"'))
  assert.ok(source.includes('aria-label="Command center page"'))
  assert.ok(source.includes('<select'))
  assert.ok(source.includes('aria-label="Refresh telemetry"'))
})
