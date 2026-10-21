import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, Zap, AlertTriangle, Cpu, DollarSign, Clock } from 'lucide-react';
import { ResponseMetadata } from '../../server/types';

interface ResponseMetadataDrawerProps {
  metadata?: ResponseMetadata;
}

export const ResponseMetadataDrawer: React.FC<ResponseMetadataDrawerProps> = ({ metadata }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!metadata) return null;

  return (
    <div className="mt-2 text-xs border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-800/70 text-zinc-400 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-medium text-zinc-300">
            <Cpu size={13} className="text-indigo-400" />
            {metadata.actualModel}
          </span>
          {metadata.fallbackOccurred && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800 flex items-center gap-1">
              <AlertTriangle size={10} /> Fallback
            </span>
          )}
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-800 flex items-center gap-1">
            <ShieldCheck size={10} /> Free Verified
          </span>
          <span className="text-zinc-500 flex items-center gap-1">
            <Clock size={11} /> {metadata.latencyMs}ms
          </span>
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          <span>{isOpen ? 'Hide Details' : 'Routing Details'}</span>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/70 space-y-2 text-zinc-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Requested Model</span>
              <span className="font-mono text-zinc-200 truncate block font-medium" title={metadata.requestedModel}>
                {metadata.requestedModel}
              </span>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Actual Serving Model</span>
              <span className="font-mono text-emerald-300 truncate block font-medium" title={metadata.actualModel}>
                {metadata.actualModel}
              </span>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Serving Provider</span>
              <span className="text-zinc-200 block font-medium">{metadata.providerDisplayName}</span>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Estimated Cost</span>
              <span className="text-emerald-400 font-semibold block flex items-center gap-1">
                <DollarSign size={11} /> 0.00 (Zero Charge)
              </span>
            </div>
          </div>

          {metadata.fallbackOccurred && (
            <div className="p-2 rounded bg-amber-950/40 border border-amber-900/60 text-amber-200">
              <span className="font-semibold block text-[11px] mb-0.5">Transparent Fallback Policy Enforcement:</span>
              <p className="text-xs text-amber-300/90 leading-relaxed">{metadata.fallbackReason}</p>
            </div>
          )}

          {metadata.tokenUsage && (
            <div className="flex flex-wrap gap-4 pt-1 text-zinc-400 text-[11px]">
              <span>Prompt Tokens: <strong className="text-zinc-200">{metadata.tokenUsage.promptTokens ?? 'N/A'}</strong></span>
              <span>Completion Tokens: <strong className="text-zinc-200">{metadata.tokenUsage.completionTokens ?? 'N/A'}</strong></span>
              <span>Total Tokens: <strong className="text-zinc-200">{metadata.tokenUsage.totalTokens ?? 'N/A'}</strong></span>
              <span>Request ID: <strong className="text-zinc-500 font-mono">{metadata.requestId}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
