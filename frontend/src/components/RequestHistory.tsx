import React, { useEffect, useState } from 'react';
import { fetchStatus, replyToRequest } from '../services/api';
import { CheckCircle, XCircle, Clock, Activity, Terminal, MessageCircle, Send, Loader2 } from 'lucide-react';

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

export const RequestHistory: React.FC<RequestHistoryProps> = ({ activeRequestId, onExecutionComplete, socket }) => {
  const [requestData, setRequestData] = useState<RequestStatus | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (!activeRequestId) return;

    // 1. Initial Fetch
    const getStatus = async () => {
      try {
        const data = await fetchStatus(activeRequestId);
        setRequestData(data as RequestStatus);

        if (data.status === 'success' || data.status === 'failed' || data.status === 'destroyed') {
          onExecutionComplete();
        }
      } catch (err) {
        console.error("Failed to fetch initial status", err);
      }
    };

    getStatus();

    // 2. WebSocket Listeners
    if (socket) {
      socket.on('log_update', (data: { requestId: number; log: string }) => {
        if (data.requestId === activeRequestId) {
          setRequestData(prev => {
            if (!prev) return prev;
            // Prevent duplicate logs if polling and socket overlap
            if (prev.logs.includes(data.log)) return prev;
            return {
              ...prev,
              logs: [...prev.logs, data.log]
            };
          });
        }
      });

      socket.on('status_update', (data: { requestId: number; status: any }) => {
        if (data.requestId === activeRequestId) {
          setRequestData(prev => prev ? { ...prev, status: data.status } : null);
          if (data.status === 'success' || data.status === 'failed' || data.status === 'destroyed') {
            onExecutionComplete();
          }
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('log_update');
        socket.off('status_update');
      }
    };
  }, [activeRequestId, onExecutionComplete, socket]);

  const handleReply = async () => {
    if (!replyText.trim() || !activeRequestId || isReplying) return;
    setIsReplying(true);
    try {
      await replyToRequest(activeRequestId, replyText.trim());
      setReplyText('');
    } catch (err) {
      console.error("Failed to send reply", err);
    } finally {
      setIsReplying(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  if (!requestData && !activeRequestId) {
    return (
      <div className="mt-12 text-center text-slate-500 flex flex-col items-center">
        <Terminal className="h-12 w-12 mb-4 opacity-50" />
        <p>Your execution pipeline history will appear here.</p>
      </div>
    );
  }

  if (!requestData) return <div className="mt-8 text-center text-slate-400">Loading pipeline state...</div>;

  const StatusIcon = () => {
    switch (requestData.status) {
      case 'success': return <CheckCircle className="h-6 w-6 text-emerald-500" />;
      case 'failed': return <XCircle className="h-6 w-6 text-red-500" />;
      case 'destroyed': return <XCircle className="h-6 w-6 text-slate-500" />;
      case 'planning': return <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />;
      case 'executing': return <Activity className="h-6 w-6 text-blue-500 animate-pulse" />;
      case 'awaiting_input': return <MessageCircle className="h-6 w-6 text-purple-500 animate-pulse" />;
      default: return <Clock className="h-6 w-6 text-slate-500" />;
    }
  };

  const statusLabel = requestData.status === 'awaiting_input' ? 'Awaiting Your Input' : requestData.status;

  const renderLogs = () => {
    if (!requestData.logs || requestData.logs.length === 0) {
      return <div className="text-slate-500">Waiting for pipeline logs...</div>;
    }

    const allLines: string[] = [];
    requestData.logs.forEach(log => {
      log.split('\n').forEach(line => allLines.push(line));
    });

    return allLines.map((line, idx) => {
      let colorClass = 'text-slate-300';
      if (line.includes('❌') || line.includes('⛔') || line.toLowerCase().includes('fail') || line.toLowerCase().includes('error')) {
        colorClass = 'text-red-400';
      } else if (line.includes('✅') || line.toLowerCase().includes('success') || line.toLowerCase().includes('approved')) {
        colorClass = 'text-emerald-400';
      } else if (line.includes('💰') || line.includes('📊')) {
        colorClass = 'text-amber-400';
      } else if (line.includes('🤖') || line.includes('❓')) {
        colorClass = 'text-purple-400';
      } else if (line.includes('🚀') || line.includes('🧠') || line.includes('🛡️')) {
        colorClass = 'text-blue-400';
      } else if (line.includes('📦') || line.includes('🆔') || line.includes('🪣')) {
        colorClass = 'text-cyan-400';
      }

      return (
        <div key={idx} className="flex">
          <span className="text-slate-600 select-none mr-4 min-w-[24px]">{String(idx + 1).padStart(2, '0')}</span>
          <span className={`${colorClass} whitespace-pre-wrap`}>{line}</span>
        </div>
      );
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
      <div className="border-b border-slate-700 p-4 bg-slate-800/50 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <StatusIcon />
          <div>
            <h3 className="text-lg font-medium text-white">Request #{requestData.id}</h3>
            <span className="text-sm font-semibold capitalize tracking-wide text-slate-400">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-900 font-mono text-sm h-80 overflow-y-auto space-y-1">
        {renderLogs()}
      </div>

      {requestData.status === 'awaiting_input' && (
        <div className="border-t border-slate-700 p-4 bg-slate-800/80">
          <p className="text-sm text-purple-400 mb-2 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Answer the AI's questions to continue:
          </p>
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              placeholder="Type your answers here..."
              className="flex-1 bg-slate-900 text-white rounded-lg p-3 min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-500 text-sm"
              disabled={isReplying}
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || isReplying}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white px-4 rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed self-end h-[42px]"
            >
              {isReplying
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <Send className="h-5 w-5" />
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
