import React, { useState } from 'react';
import { PromptInput } from './components/PromptInput';
import { RequestHistory } from './components/RequestHistory';
import { PastRequests } from './components/PastRequests';
import { submitRequest } from './services/api';
import { ServerCog } from 'lucide-react';

function App() {
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePromptSubmit = async (prompt: string) => {
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const response = await submitRequest(prompt);
      setActiveRequestId(response.id);
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
          {errorMsg && (
            <div className="max-w-2xl mx-auto mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-center">
              {errorMsg}
            </div>
          )}

          <PromptInput onSubmit={handlePromptSubmit} isLoading={isExecuting} />
          
          <RequestHistory 
            activeRequestId={activeRequestId} 
            onExecutionComplete={handleExecutionComplete} 
          />

          <PastRequests />
        </main>
      </div>
    </div>
  );
}

export default App;
