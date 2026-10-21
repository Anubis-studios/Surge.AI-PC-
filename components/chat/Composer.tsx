import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, ShieldCheck, ChevronDown, Sparkles, AlertTriangle } from 'lucide-react';
import { ModelDefinition } from '../../server/types';

interface ComposerProps {
  onSendMessage: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  selectedModel: ModelDefinition;
  onOpenModelSelector: () => void;
  freeOnly: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  onStop,
  isStreaming,
  selectedModel,
  onOpenModelSelector,
  freeOnly
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isMiniMax = selectedModel.id === 'minimax/minimax-m2.7';

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-950/80 p-3 sm:p-4 backdrop-blur-md">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Model & Routing Status Banner */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenModelSelector}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors"
            >
              <span className="font-semibold text-indigo-300">{selectedModel.name}</span>
              <span className="text-[11px] text-zinc-500">({selectedModel.providerDisplayName})</span>
              <ChevronDown size={12} className="text-zinc-500" />
            </button>

            {isMiniMax && freeOnly && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-900/60">
                <AlertTriangle size={11} />
                Paid Endpoint Blocked • Free Fallback Armed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                freeOnly
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
              title="Strict Free-Only Mode guarantees zero charges for inference"
            >
              <ShieldCheck size={12} />
              <span>{freeOnly ? 'Strict Free-Only: ON' : 'Paid Allowed'}</span>
            </div>
          </div>
        </div>

        {/* Input Text Box */}
        <form onSubmit={handleSubmit} className="relative rounded-xl border border-zinc-700/80 bg-zinc-900/90 focus-within:border-indigo-500/80 shadow-lg transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
            className="w-full bg-transparent px-4 py-3 pr-24 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none"
          />

          <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors shadow"
              >
                <Square size={12} className="fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={`p-2 rounded-lg transition-colors ${
                  input.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
          <span>Open Agent OS v1.0 • MiniMax M2.7 Default</span>
          <span>Zero-Cost Inference Guaranteed Under Free-Only Policy</span>
        </div>
      </div>
    </div>
  );
};
