import React, { useEffect, useState } from 'react';
import { fetchHistory, destroyResource } from '../services/api';
import { CheckCircle, XCircle, Clock, Activity, MessageCircle, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';

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

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  success:        { label: 'Completed', color: '#065F46', bg: '#D1FAE5' },
  failed:         { label: 'Failed',    color: '#991B1B', bg: '#FEE2E2' },
  destroyed:      { label: 'Destroyed', color: '#5F6B7A', bg: '#ECEEF1' },
  planning:       { label: 'Planning',  color: '#92400E', bg: '#FEF3C7' },
  executing:      { label: 'Executing', color: '#1E40AF', bg: '#DBEAFE' },
  awaiting_input: { label: 'Awaiting',  color: '#4338CA', bg: '#EEF2FF' },
  pending:        { label: 'Pending',   color: '#5F6B7A', bg: '#ECEEF1' },
};

export const PastRequests: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [destroyingId, setDestroyingId] = useState<number | null>(null);
  const [confirmDestroyId, setConfirmDestroyId] = useState<number | null>(null);

  const loadHistory = async () => {
    try { const data = await fetchHistory(); setHistory(data); }
    catch (err) { console.error('Failed to load history', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDestroy = async (item: HistoryItem) => {
    if (!item.resource_type || !item.resource_id) return;
    setDestroyingId(item.id);
    try { await destroyResource(item.resource_type, item.resource_id, item.id); await loadHistory(); setConfirmDestroyId(null); }
    catch (err) { console.error('Destroy failed', err); }
    finally { setDestroyingId(null); }
  };

  const getResource = (item: HistoryItem): string | null => {
    if (item.resource_type && item.resource_id) return `${item.resource_type.toUpperCase()} · ${item.resource_id}`;
    if (!item.logs || !item.logs.length) return null;
    const t = item.logs.join(' ');
    const ec2 = t.match(/Instance ID:\s*(i-[a-f0-9]+)/);
    if (ec2) return `EC2 · ${ec2[1]}`;
    const s3 = t.match(/Bucket.*?:\s*([a-z0-9.-]+)/i);
    if (s3) return `S3 · ${s3[1]}`;
    return null;
  };

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (loading) return <div className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  if (!history.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>History</span>
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{history.length} requests</span>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
        {/* Table header */}
        <div
          className="grid grid-cols-[44px_1fr_150px_90px_50px_44px] gap-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', borderBottom: '1px solid var(--surface-3)' }}
        >
          <span>ID</span>
          <span>Prompt</span>
          <span>Resource</span>
          <span>Status</span>
          <span>Time</span>
          <span></span>
        </div>

        {/* Rows */}
        {history.map(item => {
          const cfg = statusMap[item.status] || statusMap.pending;
          const resource = getResource(item);
          const isExp = expandedId === item.id;
          const canDestroy = item.status === 'success' && item.resource_id && (item.resource_type === 'ec2' || item.resource_type === 's3');

          return (
            <div key={item.id} style={{ borderBottom: '1px solid var(--surface-2)' }} className="last:border-b-0">
              <div className="grid grid-cols-[44px_1fr_150px_90px_50px_44px] gap-2 items-center px-5 py-3 text-[13px] hover:bg-[#F8F9FA] transition-colors">
                <span className="mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{item.id}</span>
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{item.prompt}</span>
                <span className="mono text-[11px] truncate" style={{ color: 'var(--accent)' }}>{resource || '—'}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md inline-block w-fit" style={{ color: cfg.color, background: cfg.bg }}>
                  {cfg.label}
                </span>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(item.created_at)}</span>

                <div className="flex items-center gap-1 justify-end">
                  {canDestroy && (
                    confirmDestroyId === item.id ? (
                      <div className="flex gap-0.5">
                        <button onClick={() => handleDestroy(item)} disabled={destroyingId === item.id} className="text-red-500 hover:text-red-600 p-0.5">
                          {destroyingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setConfirmDestroyId(null)} className="p-0.5" style={{ color: 'var(--text-muted)' }}>
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDestroyId(item.id)} className="p-0.5 hover:text-red-500 transition-colors" style={{ color: 'var(--surface-3)' }} title="Destroy">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                  <button onClick={() => setExpandedId(isExp ? null : item.id)} className="p-0.5 hover:text-gray-600 transition-colors" style={{ color: 'var(--surface-3)' }}>
                    {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded logs */}
              {isExp && item.logs && item.logs.length > 0 && (
                <div className="bg-[#1E1E2E] px-5 py-3 mono text-[11px] leading-4 max-h-52 overflow-y-auto" style={{ borderTop: '1px solid var(--surface-3)' }}>
                  {item.logs.flatMap(l => l.split('\n')).map((line, idx) => {
                    let c = '#9CA3AF';
                    if (line.includes('❌') || /fail/i.test(line)) c = '#EF4444';
                    else if (line.includes('✅') || /success/i.test(line)) c = '#10B981';
                    else if (line.includes('💰') || line.includes('📊')) c = '#F59E0B';
                    else if (line.includes('🤖') || line.includes('❓')) c = '#6366F1';
                    else if (line.includes('📦') || line.includes('🆔')) c = '#06B6D4';
                    return (
                      <div key={idx} className="flex">
                        <span className="select-none mr-3 w-5 text-right shrink-0" style={{ color: '#4B5563' }}>{idx + 1}</span>
                        <span style={{ color: c }} className="whitespace-pre-wrap break-all">{line}</span>
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
