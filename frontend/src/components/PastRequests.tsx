import React, { useEffect, useState } from 'react';
import { fetchHistory, destroyResource } from '../services/api';
import { CheckCircle, XCircle, Clock, Activity, MessageCircle, History, ChevronDown, ChevronUp, Trash2, Loader2, AlertTriangle } from 'lucide-react';

interface HistoryItem {
  id: number;
  prompt: string;
  status: string;
  created_at: string;
  logs: string[];
  resource_type?: string;
  resource_id?: string;
  cost?: number;
}

export const PastRequests: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [destroyingId, setDestroyingId] = useState<number | null>(null);
  const [confirmDestroyId, setConfirmDestroyId] = useState<number | null>(null);

  const loadHistory = async () => {
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 10000); 
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDestroy = async (item: HistoryItem) => {
    if (!item.resource_type || !item.resource_id) return;
    
    setDestroyingId(item.id);
    try {
      await destroyResource(item.resource_type, item.resource_id, item.id);
      await loadHistory();
      setConfirmDestroyId(null);
    } catch (err) {
      console.error('Failed to destroy resource', err);
      alert('Failed to destroy resource. Please check logs.');
    } finally {
      setDestroyingId(null);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
      success: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
      failed: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
      destroyed: { icon: <Trash2 className="h-4 w-4" />, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
      planning: { icon: <Clock className="h-4 w-4 animate-pulse" />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
      executing: { icon: <Activity className="h-4 w-4 animate-pulse" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
      awaiting_input: { icon: <MessageCircle className="h-4 w-4 animate-pulse" />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
      pending: { icon: <Clock className="h-4 w-4" />, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
    };
    const c = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.color} ${c.bg}`}>
        {c.icon}
        {status === 'awaiting_input' ? 'Awaiting Input' : status}
      </span>
    );
  };

  const getResourceSummary = (item: HistoryItem): string | null => {
    if (item.resource_type && item.resource_id) {
      return `${item.resource_type.toUpperCase()}: ${item.resource_id}`;
    }
    
    if (!item.logs || item.logs.length === 0) return null;
    const allText = item.logs.join(' ');
    
    const instanceMatch = allText.match(/Instance ID:\s*(i-[a-f0-9]+)/);
    if (instanceMatch) return `EC2: ${instanceMatch[1]}`;
    
    const bucketMatch = allText.match(/Bucket.*?:\s*([a-z0-9.-]+)/i);
    if (bucketMatch) return `S3: ${bucketMatch[1]}`;

    return null;
  };

  if (loading) {
    return <div className="text-center text-slate-500 mt-8">Loading history...</div>;
  }

  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-12">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-slate-400" />
        <h2 className="text-xl font-bold text-slate-200">Request History</h2>
        <span className="text-sm text-slate-500 ml-2">({history.length} total)</span>
      </div>

      <div className="space-y-2">
        {history.map(item => {
          const resourceSummary = getResourceSummary(item);
          const isExpanded = expandedId === item.id;
          const timeAgo = new Date(item.created_at).toLocaleString();
          const canDestroy = (item.status === 'success') && item.resource_id && (item.resource_type === 'ec2' || item.resource_type === 's3');

          return (
            <div
              key={item.id}
              className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden transition-all"
            >
              <div
                className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors text-left"
              >
                <div 
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <span className="text-slate-500 text-sm font-mono">#{item.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm truncate">{item.prompt}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {resourceSummary && (
                        <p className="text-cyan-400 text-xs font-mono">{resourceSummary}</p>
                      )}
                      {item.cost && item.cost > 0 && (
                        <p className="text-amber-400 text-xs font-mono font-bold">💰 ${item.cost}/mo</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {canDestroy && (
                     confirmDestroyId === item.id ? (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 p-1 rounded-md px-2">
                          <span className="text-[10px] text-red-400 font-bold uppercase">Confirm?</span>
                          <button 
                            onClick={() => handleDestroy(item)}
                            disabled={destroyingId === item.id}
                            className="text-red-500 hover:text-white hover:bg-red-500 p-1 rounded transition-all"
                          >
                            {destroyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={() => setConfirmDestroyId(null)}
                            className="text-slate-400 hover:text-white p-1"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                     ) : (
                      <button 
                        onClick={() => setConfirmDestroyId(item.id)}
                        className="text-slate-500 hover:text-red-400 p-2 rounded-md hover:bg-red-500/10 transition-all group"
                        title="Destroy Resource"
                      >
                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      </button>
                     )
                  )}
                  <StatusBadge status={item.status} />
                  <button onClick={() => toggleExpand(item.id)}>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-slate-500" />
                      : <ChevronDown className="h-4 w-4 text-slate-500" />
                    }
                  </button>
                </div>
              </div>

              {isExpanded && item.logs && item.logs.length > 0 && (
                <div className="border-t border-slate-700 p-4 bg-slate-900 font-mono text-xs max-h-60 overflow-y-auto space-y-1">
                  {item.logs.flatMap(log => log.split('\n')).map((line, idx) => {
                    let colorClass = 'text-slate-400';
                    if (line.includes('❌') || line.includes('⛔') || line.toLowerCase().includes('fail')) colorClass = 'text-red-400';
                    else if (line.includes('✅') || line.toLowerCase().includes('success')) colorClass = 'text-emerald-400';
                    else if (line.includes('💰') || line.includes('📊')) colorClass = 'text-amber-400';
                    else return colorClass = 'text-slate-300';

                    return (
                      <div key={idx} className="flex">
                        <span className="text-slate-600 select-none mr-3 min-w-[20px]">{String(idx + 1).padStart(2, '0')}</span>
                        <span className={`${colorClass} whitespace-pre-wrap break-all`}>{line}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
