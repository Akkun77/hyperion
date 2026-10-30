import React, { useEffect, useState } from 'react';
import api from '../api';
import MetricCard from '../components/MetricCard';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Overview: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalEndpoints: 0,
    totalRequests: 0,
    totalAlerts: 0,
    highRiskEndpoints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: Array<{ label: string; data: number[]; backgroundColor: string; borderColor: string; tension: number }>;
  }>({ labels: [], datasets: [{ label: 'Requests per minute', data: [], backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', tension: 0.1 }] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        // Fetch traffic events (sample)
        const trafficRes = await api.getTrafficEvents(0, 1000);
        setTrafficData(trafficRes);
        const kpis = await api.getKPIs();
        setMetrics({
          totalEndpoints: kpis.total_apis,
          totalRequests: kpis.total_requests_observed,
          totalAlerts: kpis.active_alerts,
          highRiskEndpoints: kpis.high_risk_endpoints,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (trafficData.length > 0) {
      // Group by minute
      const map = new Map();
      trafficData.forEach((event: any) => {
        // Assuming event.timestamp is a string in ISO format or a number
        let date: Date;
        if (typeof event.timestamp === 'string') {
          date = new Date(event.timestamp);
        } else {
          date = new Date(event.timestamp);
        }
        const minute = date.getMinutes();
        const hour = date.getHours();
        const key = `${hour}:${minute}`;
        const count = map.get(key) || 0;
        map.set(key, count + 1);
      });
      // Sort by time
      const sorted = Array.from(map.entries()).sort((a, b) => {
        const [timeA, timeB] = [a[0], b[0]];
        const [hourA, minuteA] = timeA.split(':').map(Number);
        const [hourB, minuteB] = timeB.split(':').map(Number);
        return hourA * 60 + minuteA - (hourB * 60 + minuteB);
      });
      const labels = sorted.map((entry) => entry[0]);
      const data = sorted.map((entry) => entry[1]);
      setChartData({ labels, datasets: [{ label: 'Requests per minute', data, backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', tension: 0.1 }] });
    }
  }, [trafficData]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Loading dashboard data...</p>
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
      <h1 className="text-2xl font-bold text-hyperion-50 mb-4">Security Overview</h1>
      <p className="text-hyperion-100 mb-6">
        Key metrics and trends from the API security platform.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total API Endpoints"
          value={metrics.totalEndpoints}
          trendLabel="endpoints"
        />
        <MetricCard
          title="Total Requests"
          value={metrics.totalRequests}
          trendLabel="requests"
        />
        <MetricCard
          title="Active Security Alerts"
          value={metrics.totalAlerts}
          trendLabel="alerts"
        />
        <MetricCard
          title="High-Risk Endpoints"
          value={metrics.highRiskEndpoints}
          trendLabel="endpoints"
        />
      </div>

      <div className="bg-hyperion-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-hyperion-50 mb-4">Traffic Volume (Requests per Minute)</h2>
        <div className="relative">
          <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
};

export default Overview;
