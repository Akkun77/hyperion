import React, { useEffect, useState } from 'react';
import api from '../api';
import { APITrafficLog } from '../types';

interface InvestigationProps {
  item: { itemType: string; itemData: any } | null;
  onBack: () => void;
}

const Investigation: React.FC<InvestigationProps> = ({ item, onBack }) => {
  const [trafficLog, setTrafficLog] = useState<APITrafficLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const relatedEventId = item?.itemType === 'alert'
    ? item.itemData.related_event_ids?.[0]
    : undefined;

  useEffect(() => {
    setTrafficLog(null);
    setError(null);
    if (!relatedEventId) {
      setTrafficLog(null);
      return;
    }

    api.getTrafficLogById(relatedEventId)
      .then(setTrafficLog)
      .catch((fetchError: Error) => setError(fetchError.message));
  }, [relatedEventId]);

  if (!item) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-hyperion-50">Investigation</h1>
        <p className="mt-2 text-hyperion-100">Select an inventory record or security alert to inspect its evidence.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button className="mb-4 text-sm text-hyperion-200 hover:text-white" onClick={onBack}>
        ← Clear selection
      </button>
      <h1 className="text-2xl font-bold text-hyperion-50">Investigation Evidence</h1>
      <p className="mt-2 text-hyperion-100">Live data supplied by the Hyperion FastAPI backend.</p>

      <section className="mt-6 rounded-lg bg-hyperion-800 p-5 shadow-md">
        <h2 className="text-lg font-semibold text-hyperion-50">Selected {item.itemType}</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(item.itemData).map(([key, value]) => (
            <div key={key}>
              <dt className="text-hyperion-200">{key}</dt>
              <dd className="break-words text-white">{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {relatedEventId && (
        <section className="mt-4 rounded-lg bg-hyperion-800 p-5 shadow-md">
          <h2 className="text-lg font-semibold text-hyperion-50">Related traffic event #{relatedEventId}</h2>
          {error && <p className="mt-2 text-red-300">Evidence lookup failed: {error}</p>}
          {trafficLog && (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-hyperion-200">Request</dt><dd>{trafficLog.method} {trafficLog.endpoint}</dd></div>
              <div><dt className="text-hyperion-200">Caller IP</dt><dd>{trafficLog.caller_ip || 'Unknown'}</dd></div>
              <div><dt className="text-hyperion-200">Target resource</dt><dd>{trafficLog.target_resource_id || 'None'}</dd></div>
              <div><dt className="text-hyperion-200">Observed at</dt><dd>{new Date(trafficLog.timestamp).toLocaleString()}</dd></div>
            </dl>
          )}
        </section>
      )}
    </div>
  );
};

export default Investigation;
