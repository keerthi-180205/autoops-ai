import React, { useEffect, useState } from 'react';
import { fetchStatus, replyToRequest } from '../services/api';
import { CheckCircle, XCircle, Clock, Activity, MessageCircle, Send, Loader2 } from 'lucide-react';

interface RequestStatus {
  id: number;
  status: 'pending' | 'planning' | 'executing' | 'success' | 'failed' | 'awaiting_input' | 'destroyed';
  prompt: string;
  message: string;
  logs: string[];
}

interface RequestHistoryProps {
  activeRequestId: number | null;
  onExecutionComplete: () => void;
  socket: any;
}

const statusCfg: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:        { label: 'Pending',     color: '#5F6B7A', bg: '#ECEEF1', dot: '#9CA3AF' },
  planning:       { label: 'Planning',    color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  executing:      { label: 'Executing',   color: '#1E40AF', bg: '#DBEAFE', dot: '#3B82F6' },
  awaiting_input: { label: 'Needs Input', color: '#4338CA', bg: '#EEF2FF', dot: '#6366F1' },
  success:        { label: 'Completed',   color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  failed:         { label: 'Failed',      color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
  destroyed:      { label: 'Destroyed',   color: '#5F6B7A', bg: '#ECEEF1', dot: '#9CA3AF' },
};

export const RequestHistory: React.FC<RequestHistoryProps> = ({ activeRequestId, onExecutionComplete, socket }) => {
  const [requestData, setRequestData] = useState<RequestStatus | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (!activeRequestId) return;
    const getStatus = async () => {
      try {
        const data = await fetchStatus(activeRequestId);
        setRequestData(data as RequestStatus);
        if (['success', 'failed', 'destroyed'].includes(data.status)) onExecutionComplete();
      } catch (err) { console.error('Failed to fetch status', err); }
    };
    getStatus();

    if (socket) {
      socket.on('log_update', (data: { requestId: number; log: string }) => {
        if (data.requestId === activeRequestId) {
          setRequestData(prev => {
            if (!prev || prev.logs.includes(data.log)) return prev;
            return { ...prev, logs: [...prev.logs, data.log] };
          });
        }
      });
      socket.on('status_update', (data: { requestId: number; status: any }) => {
        if (data.requestId === activeRequestId) {
          setRequestData(prev => prev ? { ...prev, status: data.status } : null);
          if (['success', 'failed', 'destroyed'].includes(data.status)) onExecutionComplete();
        }
      });
    }
    return () => { if (socket) { socket.off('log_update'); socket.off('status_update'); } };
  }, [activeRequestId, onExecutionComplete, socket]);

  const handleReply = async () => {
    if (!replyText.trim() || !activeRequestId || isReplying) return;
    setIsReplying(true);
    try { await replyToRequest(activeRequestId, replyText.trim()); setReplyText(''); }
    catch (err) { console.error('Failed to send reply', err); }
    finally { setIsReplying(false); }
  };

  if (!requestData && !activeRequestId) return null;
  if (!requestData) return <div className="mt-6 text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Loading pipeline…</div>;

  const cfg = statusCfg[requestData.status] || statusCfg.pending;
  const isActive = ['planning', 'executing', 'awaiting_input'].includes(requestData.status);

  const allLines: string[] = [];
  if (requestData.logs) requestData.logs.forEach(log => log.split('\n').forEach(l => allLines.push(l)));

  const lineColor = (line: string): string => {
    if (line.includes('❌') || line.includes('⛔') || /fail|error/i.test(line)) return '#EF4444';
    if (line.includes('✅') || /success|approved/i.test(line)) return '#10B981';
    if (line.includes('💰') || line.includes('📊')) return '#F59E0B';
    if (line.includes('🤖') || line.includes('❓')) return '#6366F1';
    if (line.includes('🚀') || line.includes('🧠') || line.includes('🛡️')) return '#3B82F6';
    if (line.includes('📦') || line.includes('🆔') || line.includes('🪣')) return '#06B6D4';
    return '#D1D5DB';
  };

  return (
    <div className="mb-10">
      {/* Section label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active Pipeline</span>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            {cfg.label}
          </span>
        </div>
        <span className="mono text-[12px]" style={{ color: 'var(--text-muted)' }}>#{requestData.id}</span>
      </div>

      {/* Card */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
        {/* Terminal log area — dark inset */}
        <div className="bg-[#1E1E2E] px-5 py-4 h-72 overflow-y-auto mono text-[12px] leading-5">
          {allLines.length === 0 ? (
            <div style={{ color: '#6B7280' }}>Waiting for pipeline output…</div>
          ) : (
            allLines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-white/5 rounded-sm">
                <span className="select-none mr-4 w-6 text-right shrink-0" style={{ color: '#4B5563' }}>{idx + 1}</span>
                <span style={{ color: lineColor(line) }} className="whitespace-pre-wrap break-all">{line}</span>
              </div>
            ))
          )}
        </div>

        {/* Reply input — indigo accent zone */}
        {requestData.status === 'awaiting_input' && (
          <div className="px-5 py-4" style={{ background: 'var(--accent-light)', borderTop: '1px solid var(--surface-3)' }}>
            <div className="flex items-center gap-2 text-[13px] font-medium mb-3" style={{ color: 'var(--accent)' }}>
              <MessageCircle className="w-4 h-4" />
              <span>Answer the questions above to continue</span>
            </div>
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                placeholder="Type your answers…"
                rows={2}
                className="flex-1 text-[13px] rounded-lg px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)', color: 'var(--text-primary)' }}
                disabled={isReplying}
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || isReplying}
                className="w-10 h-10 rounded-lg text-white flex items-center justify-center transition-colors self-end disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
