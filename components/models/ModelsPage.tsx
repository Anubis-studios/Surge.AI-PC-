import React, { useState, useMemo } from 'react';
import { ModelDefinition } from '../../server/types';
import { Search, ShieldCheck, Zap, Lock, Cpu, Sparkles, Check, CheckCircle2 } from 'lucide-react';

interface ModelsPageProps {
  models: ModelDefinition[];
  defaultModelId: string;
  onSetDefaultModel: (modelId: string) => Promise<void>;
  onSelectForChat: (model: ModelDefinition) => void;
}

export const ModelsPage: React.FC<ModelsPageProps> = ({
  models,
  defaultModelId,
  onSetDefaultModel,
  onSelectForChat
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'limits' | 'paid' | 'local' | 'coding' | 'reasoning' | 'vision'>('all');
  const [justSetDefault, setJustSetDefault] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return models.filter(m => {
      const match =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.providerDisplayName.toLowerCase().includes(search.toLowerCase());

      if (!match) return false;

      if (filter === 'free') return m.freeEligibility === 'verified_free';
      if (filter === 'limits') return m.freeEligibility === 'free_with_limits';
      if (filter === 'paid') return m.freeEligibility === 'paid';
      if (filter === 'local') return m.isLocal;
      if (filter === 'coding') return m.capabilities.coding;
      if (filter === 'reasoning') return m.capabilities.reasoning;
      if (filter === 'vision') return m.capabilities.vision;

      return true;
    });
  }, [models, search, filter]);

  const handleMakeDefault = async (modelId: string) => {
    await onSetDefaultModel(modelId);
    setJustSetDefault(modelId);
    setTimeout(() => setJustSetDefault(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <Cpu className="text-indigo-400" size={24} />
              AI Model Registry & Capabilities
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Search and inspect verified free endpoints, rate-limited developer tiers, and local models.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg self-start">
            <span>Default Model:</span>
            <strong className="text-indigo-300 font-semibold">{defaultModelId}</strong>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search by model name or provider (e.g. MiniMax, Llama, Gemini, Groq)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: 'All Models' },
              { id: 'free', label: 'Verified Free' },
              { id: 'limits', label: 'Free Tier with Limits' },
              { id: 'paid', label: 'Paid Models' },
              { id: 'local', label: 'Local Models' },
              { id: 'coding', label: 'Coding' },
              { id: 'reasoning', label: 'Reasoning' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  filter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(m => {
            const isCurrentDefault = m.id === defaultModelId;
            const isMiniMax = m.id === 'minimax/minimax-m2.7';

            return (
              <div
                key={m.id}
                className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                  isMiniMax
                    ? 'bg-indigo-950/20 border-indigo-700/60 shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-base">{m.name}</h3>
                        {isMiniMax && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-900/80 text-indigo-300 font-semibold border border-indigo-700 flex items-center gap-1">
                            <Sparkles size={10} /> System Default
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">
                          {m.providerDisplayName}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-zinc-500 mt-0.5">{m.id}</div>
                    </div>

                    {m.freeEligibility === 'verified_free' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium flex items-center gap-1 shrink-0">
                        <ShieldCheck size={12} /> Verified Free
                      </span>
                    )}
                    {m.freeEligibility === 'free_with_limits' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-sky-950 text-sky-300 border border-sky-800 font-medium flex items-center gap-1 shrink-0">
                        <Zap size={12} /> Free with Limits
                      </span>
                    )}
                    {m.freeEligibility === 'paid' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-950 text-amber-300 border border-amber-800 font-medium flex items-center gap-1 shrink-0">
                        <Lock size={12} /> Paid Endpoint
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                    {m.description || m.statusMessage}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 mb-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block">Context Window</span>
                      <span className="text-zinc-200 font-mono font-medium">
                        {m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}k tokens` : 'Standard'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block">Token Pricing</span>
                      <span className="text-zinc-200 font-mono font-medium">
                        {m.pricing.isFree ? '$0.00 / 1M tokens' : `$${m.pricing.promptCostPerMillion.toFixed(2)} / 1M`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-400 mb-2">
                    {m.capabilities.coding && <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Coding</span>}
                    {m.capabilities.reasoning && <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Reasoning</span>}
                    {m.capabilities.toolCalling && <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Tool Calling</span>}
                    {m.capabilities.vision && <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Vision</span>}
                    {m.isLocal && <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">Local Offline</span>}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectForChat(m)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    Open in Chat
                  </button>

                  {isCurrentDefault ? (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={14} /> Current Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMakeDefault(m.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                    >
                      {justSetDefault === m.id ? 'Saved as Default!' : 'Set as Default Preference'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
