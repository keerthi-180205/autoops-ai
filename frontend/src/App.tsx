import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { PromptInput } from './components/PromptInput';
import { RequestHistory } from './components/RequestHistory';
import { PastRequests } from './components/PastRequests';
import { CostSummary } from './components/CostSummary';
import { submitRequest } from './services/api';
import { Layers } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL.replace('/api', ''), {
  transports: ['websocket', 'polling'],
  reconnection: true,
});

function App() {
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    socket.on('connect', () => console.log('WebSocket connected'));
    return () => { socket.off('connect'); };
  }, []);

  const handlePromptSubmit = async (prompt: string) => {
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const response = await submitRequest(prompt);
      setActiveRequestId(response.id);
      socket.emit('join_request', String(response.id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Could not reach the AUTOops backend. Is it running on port 5000?');
      setIsExecuting(false);
    }
  };

  const handleExecutionComplete = () => setIsExecuting(false);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      {/* ── Indigo Header Bar (the 30% accent) ── */}
      <header style={{ background: 'var(--accent)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-200" />
            <span className="text-[16px] font-bold text-white tracking-tight">AUTOops</span>
          </div>
          <CostSummary />
        </div>
      </header>

      {/* ── Body content ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>Infrastructure Orchestrator</h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Describe the AWS resources you need. The AI agents will plan, validate, price, and execute.
          </p>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mb-5 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[13px]">
            {errorMsg}
          </div>
        )}

        {/* Prompt */}
        <PromptInput onSubmit={handlePromptSubmit} isLoading={isExecuting} />

        {/* Active pipeline */}
        <RequestHistory
          activeRequestId={activeRequestId}
          onExecutionComplete={handleExecutionComplete}
          socket={socket}
        />

        {/* Past history */}
        <PastRequests />
      </div>
    </div>
  );
}

export default App;
