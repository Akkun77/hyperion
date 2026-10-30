import React, { useEffect, useState } from 'react';
import api from '../api';

interface APIInventoryProps {
  onSelectEndpoint: (endpoint: any) => void;
}

const APIInventory: React.FC<APIInventoryProps> = ({ onSelectEndpoint }) => {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all'); // 'all' or specific method

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const inventory = await api.getInventory();
        setEndpoints(inventory.map((endpoint: any) => ({
          method: endpoint.method,
          path: endpoint.endpoint,
          lastSeen: endpoint.last_seen,
          riskScore: endpoint.risk_score,
          riskExplanation: endpoint.risk_reasons,
          authRequired: endpoint.auth_type,
          apiStatus: endpoint.is_shadow ? 'Shadow' : 'Managed',
        })));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch API inventory data');
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
  const filteredEndpoints = endpoints.filter((endpoint: any) => {
    const matchesSearch = endpoint.path.toLowerCase().includes(search.toLowerCase());
    const matchesMethod = methodFilter === 'all' || endpoint.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Loading API inventory...</p>
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
      <h1 className="text-2xl font-bold text-gray-800 mb-4">API Inventory</h1>
      <p className="text-gray-600 mb-4">
        Discovered API endpoints from ingested traffic.
      </p>

      {/* Search and filter controls */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search endpoints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
        </select>
      </div>

      {filteredEndpoints.length === 0 ? (
        <p className="text-gray-500">No API endpoints match the current filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Auth
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Seen
                </th>
                <th className="px-6 px-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Risk Score
                </th>
                <th className="px-6 px-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Explanation
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEndpoints.map((endpoint, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectEndpoint(endpoint)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {endpoint.method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {endpoint.path}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {endpoint.authRequired}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {endpoint.apiStatus}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(endpoint.lastSeen).toLocaleString()}
                  </td>
                  <td className="px-6 px-3 text-left text-xs font-medium text-gray-500">
                    {endpoint.riskScore !== null ? (
                      <span className={`font-medium ${endpoint.riskScore > 60 ? 'text-red-600' : endpoint.riskScore > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {endpoint.riskScore.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {endpoint.riskExplanation ? (
                      <span className="line-clamp-1">{endpoint.riskExplanation.join('; ')}</span>
                    ) : (
                      <span className="text-italic text-gray-400">No explanation</span>
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

export default APIInventory;
