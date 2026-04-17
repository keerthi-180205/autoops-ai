import React, { useEffect, useState } from 'react';
import { fetchStatus } from '../services/api';
import { CheckCircle, XCircle, Clock, Activity, Terminal } from 'lucide-react';

interface RequestStatus {
  id: number;
  status: 'pending' | 'planning' | 'executing' | 'success' | 'failed';
  message: string;
  logs: string[];
}

interface RequestHistoryProps {
  activeRequestId: number | null;
  onExecutionComplete: () => void;
}

export const RequestHistory: React.FC<RequestHistoryProps> = ({ activeRequestId, onExecutionComplete }) => {
  const [requestData, setRequestData] = useState<RequestStatus | null>(null);

  useEffect(() => {
    if (!activeRequestId) return;

    // Immediately fetch once
    const getStatus = async () => {
      try {
        const data = await fetchStatus(activeRequestId);
        setRequestData(data as RequestStatus);
        
        if (data.status === 'success' || data.status === 'failed') {
          onExecutionComplete();
        }
      } catch (err) {
        console.error("Failed to fetch status", err);
      }
    };
    
    getStatus();

    // Poll every 2 seconds
    const interval = setInterval(() => {
      getStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRequestId, onExecutionComplete]);

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
      case 'planning': return <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />;
      case 'executing': return <Activity className="h-6 w-6 text-blue-500 animate-pulse" />;
      default: return <Clock className="h-6 w-6 text-slate-500" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
      <div className="border-b border-slate-700 p-4 bg-slate-800/50 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <StatusIcon />
          <div>
            <h3 className="text-lg font-medium text-white">Request #{requestData.id}</h3>
            <span className="text-sm font-semibold capitalize tracking-wide text-slate-400">
              {requestData.status}
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-slate-900 font-mono text-sm h-80 overflow-y-auto space-y-2">
        {requestData.logs && requestData.logs.length > 0 ? (
          requestData.logs.map((log, idx) => (
            <div key={idx} className="flex">
              <span className="text-slate-500 select-none mr-4">{String(idx + 1).padStart(2, '0')}</span>
              <span className={log.toLowerCase().includes('error') || log.toLowerCase().includes('fail') ? 'text-red-400' : log.toLowerCase().includes('success') || log.toLowerCase().includes('approved') ? 'text-emerald-400' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))
        ) : (
          <div className="text-slate-500">Waiting for pipeline logs...</div>
        )}
      </div>
    </div>
  );
};
