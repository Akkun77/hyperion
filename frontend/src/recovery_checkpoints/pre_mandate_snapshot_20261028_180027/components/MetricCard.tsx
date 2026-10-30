// src/components/MetricCard.tsx
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number; // percentage change, positive for increase, negative for decrease
  trendLabel?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, trendLabel, onClick }) => {
  const trendColor = trend !== undefined ? (trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500') : 'text-gray-500';
  const trendIcon = trend !== undefined ? (trend > 0 ? '▲' : trend < 0 ? '▼' : '') : '';

  return (
    <div className="bg-hyperion-800 rounded-lg shadow-md p-6 hover:bg-hyperion-700 cursor-pointer transition-colors duration-200" onClick={onClick}>
      <h3 className="text-lg font-medium text-hyperion-100 mb-2">{title}</h3>
      <div className="flex items-baseline mb-2">
        <span className="text-3xl font-bold text-hyperion-50">{value}</span>
        {trend !== undefined && trendLabel && (
          <span className={`ml-2 text-sm font-medium ${trendColor}`}>
            {trendIcon} {Math.abs(trend)}% {trendLabel}
          </span>
        )}
      </div>
      {trend !== undefined && !trendLabel && (
        <span className={`text-sm font-medium ${trendColor}`}>
          {trendIcon} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
};

export default MetricCard;
