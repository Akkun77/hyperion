// src/components/SeverityBadge.tsx
import React from 'react';

interface SeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const colorMap: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
    critical: 'bg-purple-100 text-purple-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[severity]}`}>
      {severity}
    </span>
  );
};

export default SeverityBadge;
