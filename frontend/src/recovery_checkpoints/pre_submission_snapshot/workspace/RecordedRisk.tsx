import type { ExecutionFlowResponse } from '../types'

export function recordedRisk(flow?: ExecutionFlowResponse) {
  const stage = flow?.stages.find(item => item.id === 'risk-recalculation') ??
    flow?.stages.find(item => Object.prototype.hasOwnProperty.call(item.meta, 'Endpoint Score'))
  const raw = stage?.meta['Endpoint Score']
  const match = typeof raw === 'string' ? raw.trim().match(/^(\d+(?:\.\d+)?)\s*(?:\/\s*100)?$/) : null
  const value = typeof raw === 'number' ? raw : match ? Number(match[1]) : NaN
  const score = Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
  const severity = typeof stage?.meta['Exposure Severity'] === 'string' ? stage.meta['Exposure Severity'] : null
  const driver = stage?.meta['Primary Driver']
  let factors: string[] = []
  if (typeof driver === 'string' && driver.trim()) {
    try {
      const parsed: unknown = JSON.parse(driver)
      factors = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [driver]
    } catch { factors = [driver] }
  }
  return { score, severity, factors }
}

export default function RecordedRisk({ flow }: { flow?: ExecutionFlowResponse }) {
  const { score, severity, factors } = recordedRisk(flow)
  if (score === null) return <span>Not available</span>
  return <span>Recorded endpoint score: {score} / 100{severity ? ` · ${severity}` : ''}
    {factors.length > 0 ? `. ${factors.join(' · ')}` : ''}</span>
}
