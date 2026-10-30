import type { APITrafficEvent } from '../types'

export function filterTraffic(rows: APITrafficEvent[], filters: { search: string; method: string; status: string; range: string }, now = Date.now()) {
  const query = filters.search.trim().toLowerCase()
  const minutes = Number(filters.range)
  return rows.filter(row => {
    const stamp = Date.parse(row.timestamp)
    return `${row.endpoint} ${row.caller_ip ?? ''} ${row.user_id ?? ''} ${row.id}`.toLowerCase().includes(query)
      && (filters.method === 'all' || row.method === filters.method)
      && (filters.status === 'all' || Math.floor(row.status_code / 100) === Number(filters.status))
      && (filters.range === 'all' || (Number.isFinite(stamp) && stamp >= now - minutes * 60000 && stamp <= now))
  })
}
export function trafficBuckets(rows: APITrafficEvent[]): [number, number][] {
  const buckets = new Map<number, number>()
  rows.forEach(row => {
    const minute = Math.floor(Date.parse(row.timestamp) / 60000) * 60000
    if (Number.isFinite(minute)) buckets.set(minute, (buckets.get(minute) || 0) + 1)
  })
  return [...buckets.entries()].sort((a, b) => a[0] - b[0])
}
export function findingIsNew(timestamp: string, openedAt: number) {
  return Date.parse(timestamp) > openedAt
}
