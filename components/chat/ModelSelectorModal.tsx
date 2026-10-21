import React, { useState, useMemo } from 'react';
import { X, Search, ShieldCheck, AlertCircle, Cpu, Zap, Check, Lock, Sparkles } from 'lucide-react';
import { ModelDefinition } from '../../server/types';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelDefinition[];
  selectedModelId: string;
  onSelectModel: (model: ModelDefinition) => void;
  onSetAsDefault?: (model: ModelDefinition) => void;
  freeOnly: boolean;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  models,
  selectedModelId,
  onSelectModel,
  onSetAsDefault,
  freeOnly
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'limits' | 'paid' | 'coding' | 'reasoning' | 'vision'>('all');

  const filteredModels = useMemo(() => {
    return models.filter(m => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.providerDisplayName.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (filter === 'free') return m.freeEligibility === 'verified_free';
      if (filter === 'limits') return m.freeEligibility === 'free_with_limits';
      if (filter === 'paid') return m.freeEligibility === 'paid';
      if (filter === 'coding') return m.capabilities.coding;
      if (filter === 'reasoning') return m.capabilities.reasoning;
      if (filter === 'vision') return m.capabilities.vision;

      return true;
    });
  }, [models, search, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="text-indigo-400" size={20} />
              Select AI Model
            </h2>
            <p className="text-xs text-zinc-400">
              Default preference: <strong className="text-indigo-300">MiniMax M2.7</strong> • Free-Only Policy: {freeOnly ? <span className="text-emerald-400 font-medium">Strict (Active)</span> : <span className="text-amber-400 font-medium">Paid Allowed</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-950/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search by model name, provider, or ID (e.g. minimax, llama, gemini)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700/80 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: 'All Models' },
              { id: 'free', label: 'Verified Free' },
              { id: 'limits', label: 'Free with Limits' },
              { id: 'paid', label: 'Paid / Fallback' },
              { id: 'coding', label: 'Coding' },
              { id: 'reasoning', label: 'Reasoning' },
              { id: 'vision', label: 'Vision' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  filter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredModels.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <AlertCircle size={36} className="mx-auto mb-2 opacity-40" />
              <p>No models found matching your criteria</p>
            </div>
          ) : (
            filteredModels.map(m => {
              const isSelected = m.id === selectedModelId;
              const isDefaultCandidate = m.id === 'minimax/minimax-m2.7';

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m);
                    onClose();
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500'
                      : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-white text-sm">{m.name}</span>
                        {isDefaultCandidate && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-900 text-indigo-300 font-semibold border border-indigo-700 flex items-center gap-1">
                            <Sparkles size={10} /> Preferred Default
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">
                          {m.providerDisplayName}
                        </span>
                        {m.freeEligibility === 'verified_free' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                            <ShieldCheck size={10} /> Verified Free
                          </span>
                        )}
                        {m.freeEligibility === 'free_with_limits' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800 flex items-center gap-1">
                            <Zap size={10} /> Free Tier (with Limits)
                          </span>
                        )}
                        {m.freeEligibility === 'paid' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                            <Lock size={10} /> Paid Endpoint (Fallback Ready)
                          </span>
                        )}
                        {m.isLocal && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800">
                            Local Offline
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                        {m.description || m.statusMessage}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                        <span>ID: {m.id}</span>
                        {m.contextWindow && <span>Context: {(m.contextWindow / 1000).toFixed(0)}k</span>}
                        {m.capabilities.coding && <span className="text-zinc-400">Coding</span>}
                        {m.capabilities.reasoning && <span className="text-zinc-400">Reasoning</span>}
                        {m.capabilities.vision && <span className="text-zinc-400">Vision</span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {isSelected ? (
                        <span className="p-1.5 rounded-full bg-indigo-500 text-white">
                          <Check size={14} />
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                        >
                          Select
                        </button>
                      )}

                      {onSetAsDefault && !isDefaultCandidate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetAsDefault(m);
                          }}
                          className="text-[10px] text-zinc-400 hover:text-indigo-400 transition-colors"
                        >
                          Make Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
