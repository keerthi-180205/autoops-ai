import React, { useState } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div
        className="rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400 transition-all"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}
      >
        {/* Label */}
        <div className="px-4 pt-3 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Prompt</span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your infrastructure needs..."
          rows={2}
          className="w-full bg-transparent text-[14px] px-4 pb-3 resize-none focus:outline-none placeholder:text-gray-400"
          style={{ color: 'var(--text-primary)' }}
          disabled={isLoading}
        />
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ background: 'var(--surface-2)' }}
        >
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {isLoading ? 'Processing…' : 'Press Enter ↵ to send'}
          </span>
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="px-4 py-1.5 rounded-md text-[13px] font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Send</span><ArrowUp className="w-3.5 h-3.5" /></>}
          </button>
        </div>
      </div>
    </form>
  );
};
