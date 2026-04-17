import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { PromptInput } from './components/PromptInput';
import { RequestHistory } from './components/RequestHistory';
import { PastRequests } from './components/PastRequests';
import { CostSummary } from './components/CostSummary';
import { submitRequest } from './services/api';
import { ServerCog } from 'lucide-react';

// Connect to the backend socket
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// Initialize socket once, stripping /api if present for the base connection
const socket = io(API_URL.replace('/api', ''), {
  transports: ['websocket', 'polling'], // Fallback for stability
  reconnection: true
});

function App() {
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    return () => {
      socket.off('connect');
    };
  }, []);

  const handlePromptSubmit = async (prompt: string) => {
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const response = await submitRequest(prompt);
      setActiveRequestId(response.id);
      
      // Force room join. Using toString() for key consistency.
      socket.emit('join_request', String(response.id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to reach the AutoOps backend. Is it running on port 5000?");
      setIsExecuting(false);
    }
  };

  const handleExecutionComplete = () => {
    setIsExecuting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="flex flex-col items-center justify-center mb-12 text-center">
          <div className="bg-blue-600/20 p-4 rounded-2xl mb-4 border border-blue-500/30 shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)]">
            <ServerCog className="h-12 w-12 text-blue-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
            AUTOops Orchestrator
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Natural language to zero-click AWS provisioning.
            <br /> Powered by AI Planners & Deterministic Sub-Agents.
          </p>
        </header>

        <main>
          <CostSummary />

          {errorMsg && (
            <div className="max-w-2xl mx-auto mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-center">
              {errorMsg}
            </div>
          )}

          <PromptInput onSubmit={handlePromptSubmit} isLoading={isExecuting} />
          
          <RequestHistory 
            activeRequestId={activeRequestId} 
            onExecutionComplete={handleExecutionComplete} 
            socket={socket}
          />

          <PastRequests />
        </main>
      </div>
    </div>
  );
}

export default App;
