import React, { useRef, useEffect } from 'react';
import { Conversation, ModelDefinition, ChatMessage } from '../../server/types';
import { MarkdownContent } from './MarkdownContent';
import { ResponseMetadataDrawer } from './ResponseMetadataDrawer';
import { Composer } from './Composer';
import { Bot, User, Sparkles, AlertCircle, RefreshCw, ShieldCheck, Terminal, Cpu } from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  onStop: () => void;
  onRetry: () => void;
  isStreaming: boolean;
  streamingText: string;
  streamError: string | null;
  selectedModel: ModelDefinition;
  onOpenModelSelector: () => void;
  freeOnly: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  onSendMessage,
  onStop,
  onRetry,
  isStreaming,
  streamingText,
  streamError,
  selectedModel,
  onOpenModelSelector,
  freeOnly
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = conversation?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, streamError]);

  const quickPrompts = [
    { title: 'Explain MiniMax M2.7', prompt: 'Explain the architecture and unique capabilities of the MiniMax M2.7 model and how it handles million-token contexts.' },
    { title: 'Write an Async Worker in TypeScript', prompt: 'Write a robust TypeScript worker queue with exponential backoff retries and concurrency limits.' },
    { title: 'Compare Open Inference Providers', prompt: 'Compare OpenRouter, Groq, and Cerebras in terms of latency, free tier quotas, and open model support.' },
    { title: 'Draft an AI Security Policy', prompt: 'Write a security checklist for preventing SSRF and prompt injection in multi-provider AI agents.' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden relative">
      {/* Top Header */}
      <div className="h-14 border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-zinc-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
            <Bot size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-white text-sm truncate">
              {conversation?.title || 'New Workspace Chat'}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-indigo-300">
                <Cpu size={11} /> {selectedModel.name}
              </span>
              <span>•</span>
              <span className="text-zinc-500">{selectedModel.providerDisplayName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenModelSelector}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            <span>Change Model</span>
          </button>
        </div>
      </div>

      {/* Message History or Empty State */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="max-w-2xl mx-auto py-10 text-center space-y-6">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 mb-2 shadow-inner">
              <Sparkles size={32} />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Welcome to Open Agent OS
              </h2>
              <p className="text-sm text-zinc-400 mt-2 max-w-lg mx-auto leading-relaxed">
                A unified, secure AI workspace configured with <strong className="text-indigo-300">MiniMax M2.7</strong> as the preferred default, backed by live free-tier AI providers and strict zero-charge routing.
              </p>
            </div>

            {/* Quick Status Chips */}
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" /> Strict Free-Only Active
              </span>
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                <Cpu size={13} className="text-indigo-400" /> Default: MiniMax M2.7
              </span>
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                <Terminal size={13} className="text-sky-400" /> 9 Real Provider Adapters
              </span>
            </div>

            {/* Quick Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(qp.prompt)}
                  className="p-3.5 rounded-xl border border-zinc-800 hover:border-indigo-500/60 bg-zinc-900/60 hover:bg-zinc-850 transition-all group"
                >
                  <span className="font-semibold text-white text-xs block mb-1 group-hover:text-indigo-300">
                    {qp.title}
                  </span>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {qp.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 max-w-4xl mx-auto ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-zinc-900 border border-zinc-800/80 rounded-tl-sm shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  <>
                    <MarkdownContent content={msg.content} />
                    <ResponseMetadataDrawer metadata={msg.metadata} />
                  </>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                  <User size={16} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Live Streaming Response Chunk */}
        {isStreaming && (
          <div className="flex gap-3 sm:gap-4 max-w-4xl mx-auto justify-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300 shrink-0 animate-pulse">
              <Bot size={16} />
            </div>
            <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 bg-zinc-900 border border-zinc-800 rounded-tl-sm">
              <MarkdownContent content={streamingText || 'Generating response with verified free routing...'} />
              <div className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1 align-middle" />
            </div>
          </div>
        )}

        {/* Streaming Error Banner */}
        {streamError && (
          <div className="max-w-4xl mx-auto p-4 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Inference Error</strong>
                <p className="text-xs text-rose-300 mt-0.5 leading-relaxed">{streamError}</p>
              </div>
            </div>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <Composer
        onSendMessage={onSendMessage}
        onStop={onStop}
        isStreaming={isStreaming}
        selectedModel={selectedModel}
        onOpenModelSelector={onOpenModelSelector}
        freeOnly={freeOnly}
      />
    </div>
  );
};
