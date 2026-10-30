import React, { useEffect, useState } from 'react';
import api from '../api';
import SeverityBadge from '../components/SeverityBadge';

interface SecurityAlertsProps {
  onSelectAlert: (alert: any) => void;
}

const SecurityAlerts: React.FC<SecurityAlertsProps> = ({ onSelectAlert }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all'); // 'all' or specific severity
  const [typeFilter, setTypeFilter] = useState<string>('all'); // 'all' or specific type
  const [sortBy, setSortBy] = useState<'timestamp' | 'severity' | 'type'>('timestamp');
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const res = await api.getSecurityAlerts(0, 100);
        setAlerts(res);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch security alerts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  // Filter and search
  const filteredAlerts = alerts.filter((alert: any) => {
    const matchesSearch = (alert.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity.toLowerCase() === severityFilter;
    const matchesType = typeFilter === 'all' || alert.alert_type === typeFilter;
    return matchesSearch && matchesSeverity && matchesType;
  });

  // Sort
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === 'timestamp') {
      return sortDesc
        ? (+new Date(b.timestamp)) - (+new Date(a.timestamp))
        : (+new Date(a.timestamp)) - (+new Date(b.timestamp));
    }
    if (sortBy === 'severity') {
      const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      return sortDesc
        ? severityOrder[b.severity] - severityOrder[a.severity]
        : severityOrder[a.severity] - severityOrder[b.severity];
    }
    if (sortBy === 'type') {
      return sortDesc
        ? b.alert_type.localeCompare(a.alert_type)
        : a.alert_type.localeCompare(b.alert_type);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Loading security alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Error: {error}</p>
        <p className="mt-2">Please ensure the backend is running.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Security Alerts</h1>
      <p className="text-gray-600 mb-4">
        Detected security anomalies and threats.
      </p>

      {/* Search and filter controls */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search descriptions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="scraping">Scraping</option>
          <option value="token_replay">Token Misuse</option>
          <option value="bola">BOLA</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="timestamp">Timestamp</option>
          <option value="severity">Severity</option>
          <option value="type">Type</option>
        </select>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sortDesc ? 'â–¼' : 'â–²'}
        </button>
      </div>

      {sortedAlerts.length === 0 ? (
        <p className="text-gray-500">No alerts match the current filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Alert ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Detection Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Related Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Recommended Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAlerts.map((alert, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectAlert(alert)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {alert.alert_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`text-xs font-medium ${alert.alert_type === 'scraping' ? 'text-blue-600' : alert.alert_type === 'token_misuse' ? 'text-purple-600' : 'text-orange-600'}`}>
                      {alert.alert_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <SeverityBadge severity={alert.severity.toLowerCase() as any} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="line-clamp-2">{alert.description}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {alert.detection_method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(alert.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {alert.related_event_ids && alert.related_event_ids.length > 0 ? (
                      <span className="text-xs">{alert.related_event_ids.join(', ')}</span>
                    ) : (
                      <span className="text-italic text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {alert.recommended_action ? (
                      <span className="line-clamp-2">{alert.recommended_action}</span>
                    ) : (
                      <span className="text-italic text-gray-400">None</span>
                    )}
                  </td>
                </tr>
              ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SecurityAlerts;
