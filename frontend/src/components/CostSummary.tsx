import React, { useEffect, useState } from 'react';
import { fetchCostSummary } from '../services/api';

export const CostSummary: React.FC = () => {
  const [totalCost, setTotalCost] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const d = await fetchCostSummary(); setTotalCost(d.total_cost); }
      catch {} finally { setLoading(false); }
    };
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  if (loading && totalCost === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-900/40 border border-indigo-400/30">
      <span className="text-[11px] text-indigo-200">est. monthly</span>
      <span className="text-[14px] font-bold text-white mono">${totalCost.toFixed(2)}</span>
    </div>
  );
};
