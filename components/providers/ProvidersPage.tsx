import React, { useState } from 'react';
import { ProviderConfig } from '../../server/types';
import { ConfigureProviderModal } from './ConfigureProviderModal';
import {
  Server,
  Key,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Zap,
  Clock
} from 'lucide-react';

interface ProvidersPageProps {
  providers: ProviderConfig[];
  onRefreshProviders: () => Promise<void>;
  onTestConnection: (id: string) => Promise<{ success: boolean; message: string; latencyMs?: number }>;
  onRefreshModels: (id: string) => Promise<void>;
  onSaveCredentials: (id: string, creds: any) => Promise<void>;
}

export const ProvidersPage: React.FC<ProvidersPageProps> = ({
  providers,
  onRefreshProviders,
  onTestConnection,
  onRefreshModels,
  onSaveCredentials
}) => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await onTestConnection(id);
      setTestResults(prev => ({ ...prev, [id]: res }));
      await onRefreshProviders();
    } finally {
      setTestingId(null);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await onRefreshModels(id);
      await onRefreshProviders();
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <Server className="text-indigo-400" size={24} />
              AI Providers & Health Registry
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Real connection status, live model discovery, and free-tier eligibility policies across all 9 supported adapters.
            </p>
          </div>

          <button
            onClick={onRefreshProviders}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold self-start transition-colors"
          >
            <RefreshCw size={14} /> Refresh All Statuses
          </button>
        </div>

        {/* Informational Banner */}
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-xs text-indigo-200/90 flex items-start gap-3">
          <Zap className="text-indigo-400 shrink-0 mt-0.5" size={18} />
          <div className="leading-relaxed">
            <strong className="text-white block font-semibold mb-0.5">Honest Free-Tier vs. Provider Integration Architecture</strong>
            Open Agent OS connects to genuine official provider endpoints. A provider being connected does not imply all its models are free; our server-enforced Free-Only Routing engine dynamically verifies token pricing and blocks paid endpoints, automatically routing requests to verified free alternatives.
          </div>
        </div>

        {/* Provider Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(p => {
            const result = testResults[p.id];
            const isTesting = testingId === p.id;
            const isRefreshing = refreshingId === p.id;

            let statusColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
            let statusText = 'Setup Required';
            let StatusIcon = AlertCircle;

            if (p.status === 'connected' || result?.success) {
              statusColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
              statusText = 'Connected';
              StatusIcon = CheckCircle2;
            } else if (p.isConfigured || p.hasEnvKey) {
              statusColor = 'bg-blue-950/80 text-blue-300 border-blue-800';
              statusText = 'Configured';
              StatusIcon = Key;
            } else if (p.status === 'error' || (result && !result.success)) {
              statusColor = 'bg-rose-950/80 text-rose-300 border-rose-800';
              statusText = 'Connection Error';
              StatusIcon = ShieldAlert;
            }

            return (
              <div
                key={p.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                        {p.name}
                      </h3>
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-500 hover:text-indigo-400 flex items-center gap-1 mt-0.5"
                      >
                        {p.website.replace('https://', '')} <ExternalLink size={10} />
                      </a>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 ${statusColor}`}>
                      <StatusIcon size={12} />
                      {statusText}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {p.description}
                  </p>

                  {/* Free tier policy box */}
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 mb-4 text-xs">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                      Free Tier Reality & Quotas
                    </span>
                    <p className="text-zinc-300 leading-relaxed text-[11px]">
                      {p.freeTierPolicy}
                    </p>
                  </div>

                  {/* Operational Health / Test Result */}
                  <div className="mb-4 text-xs space-y-1">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Discovered Models:</span>
                      <strong className="text-zinc-200">{p.modelsCount} models</strong>
                    </div>

                    {result ? (
                      <div className={`p-2 rounded text-[11px] leading-tight flex items-start gap-1.5 ${
                        result.success ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/50' : 'bg-rose-950/50 text-rose-300 border border-rose-900/50'
                      }`}>
                        <Activity size={12} className="shrink-0 mt-0.5" />
                        <span>{result.message} {result.latencyMs ? `(${result.latencyMs}ms)` : ''}</span>
                      </div>
                    ) : p.lastHealthCheck ? (
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Clock size={11} /> Checked: {new Date(p.lastHealthCheck).toLocaleTimeString()}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTest(p.id)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      title="Run live health check"
                    >
                      <Activity size={12} className={isTesting ? 'animate-spin' : ''} />
                      <span>{isTesting ? 'Testing...' : 'Test'}</span>
                    </button>

                    {p.supportsModelDiscovery && (
                      <button
                        onClick={() => handleRefresh(p.id)}
                        disabled={isRefreshing}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Query live catalog endpoint"
                      >
                        <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedProvider(p)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Key size={12} />
                    <span>{p.isConfigured ? 'Edit Key' : 'Configure'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfigureProviderModal
        provider={selectedProvider}
        isOpen={Boolean(selectedProvider)}
        onClose={() => setSelectedProvider(null)}
        onSave={async (id, creds) => {
          await onSaveCredentials(id, creds);
          await onRefreshProviders();
        }}
      />
    </div>
  );
};
