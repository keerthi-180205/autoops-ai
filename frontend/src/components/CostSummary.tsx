import React, { useEffect, useState } from 'react';
import { fetchCostSummary } from '../services/api';
import { DollarSign, TrendingUp } from 'lucide-react';

export const CostSummary: React.FC = () => {
  const [totalCost, setTotalCost] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadCost = async () => {
    try {
      const data = await fetchCostSummary();
      setTotalCost(data.total_cost);
    } catch (err) {
      console.error('Failed to load cost summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCost();
    const interval = setInterval(loadCost, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && totalCost === 0) return null;

  return (
    <div className="max-w-md mx-auto mb-8 bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl transition-all hover:border-amber-500/50 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl group-hover:bg-amber-500/20 transition-colors">
            <DollarSign className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Running Cost</p>
            <h3 className="text-2xl font-bold text-slate-100">${totalCost.toFixed(2)}<span className="text-slate-500 text-sm font-normal ml-1">/month</span></h3>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <span className="text-[10px] text-slate-500 mt-1 uppercase">Estimated</span>
        </div>
      </div>
    </div>
  );
};
