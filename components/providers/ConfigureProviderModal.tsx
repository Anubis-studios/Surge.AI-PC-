import React, { useState } from 'react';
import { X, Key, Shield, ExternalLink, Save, CheckCircle } from 'lucide-react';
import { ProviderConfig } from '../../server/types';

interface ConfigureProviderModalProps {
  provider: ProviderConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (providerId: string, credentials: { apiKey?: string; accountId?: string; baseUrl?: string }) => Promise<void>;
}

export const ConfigureProviderModal: React.FC<ConfigureProviderModalProps> = ({
  provider,
  isOpen,
  onClose,
  onSave
}) => {
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !provider) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(provider.id, {
        apiKey: apiKey.trim() ? apiKey.trim() : undefined,
        accountId: accountId.trim() ? accountId.trim() : undefined,
        baseUrl: baseUrl.trim() ? baseUrl.trim() : undefined
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
        setApiKey('');
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  const isCloudflare = provider.id === 'cloudflare';
  const isOllama = provider.id === 'ollama';
  const isCustom = provider.id === 'custom_openai';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="text-indigo-400" size={18} />
            <h3 className="font-bold text-white text-base">Configure {provider.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
            <Shield size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Credentials are saved securely on the server and never returned to or exposed in browser code.
            </p>
          </div>

          {provider.hasEnvKey && (
            <div className="p-2.5 rounded bg-indigo-950/40 border border-indigo-900/60 text-xs text-indigo-300">
              An API key is already configured via server environment variables. Entering a key below will override it.
            </div>
          )}

          {!isOllama && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {isCustom ? 'API Key (Optional)' : 'API Key / Token'}
              </label>
              <input
                type="password"
                placeholder={provider.isConfigured ? '••••••••••••••••••••••••' : 'Enter API Key...'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          )}

          {isCloudflare && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Cloudflare Account ID
              </label>
              <input
                type="text"
                placeholder="Cloudflare Account ID..."
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          )}

          {(isOllama || isCustom) && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Base URL
              </label>
              <input
                type="text"
                placeholder={isOllama ? 'http://localhost:11434' : 'http://localhost:1234/v1'}
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                SSRF protection active: Private cloud metadata addresses (e.g. 169.254.169.254) are strictly blocked.
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <a
              href={provider.docUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Get API Key <ExternalLink size={12} />
            </a>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle size={14} className="text-white" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{isSaving ? 'Saving...' : 'Save Credentials'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
