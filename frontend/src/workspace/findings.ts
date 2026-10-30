import type { APITrafficEvent, SecurityAlert } from '../types'
export const detectionName = (type: string) => ({ bola: 'Object access', token_replay: 'Token misuse', scraping: 'Scraping' }[type] || type.replace(/_/g, ' '))
export interface FindingFilters { search: string; severity: string; category: string; arrival: string }
export function selectFindings(alerts: SecurityAlert[], traffic: APITrafficEvent[], filters: FindingFilters, openedAt: number) {
  const query = filters.search.trim().toLowerCase()
  return alerts.filter(alert => {
    const event = traffic.find(row => alert.related_event_ids.includes(row.id))
    return (filters.category === 'all' || alert.alert_type === filters.category)
      && (filters.severity === 'all' || alert.severity.toLowerCase() === filters.severity)
      && (filters.arrival === 'all' || Date.parse(alert.timestamp) > openedAt)
      && `${alert.alert_id} ${alert.description} ${alert.alert_type} ${detectionName(alert.alert_type)} ${event?.endpoint || ''}`.toLowerCase().includes(query)
  })
}
