import React, { useState } from 'react';
import { UserPreferences, ModelDefinition } from '../../server/types';
import { Settings, Shield, ShieldCheck, Zap, Lock, Database, Check, Save } from 'lucide-react';

interface SettingsPageProps {
  preferences: UserPreferences;
  models: ModelDefinition[];
  onSavePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  preferences,
  models,
  onSavePreferences
}) => {
  const [defaultModel, setDefaultModel] = useState(preferences.defaultModel);
  const [freeOnly, setFreeOnly] = useState(preferences.freeOnly);
  const [allowFallback, setAllowFallback] = useState(preferences.allowFallback);
  const [preferredProvider, setPreferredProvider] = useState(preferences.preferredProvider);
  const [dataRetention, setDataRetention] = useState(preferences.dataRetention);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePreferences({
        defaultModel,
        freeOnly,
        allowFallback,
        preferredProvider,
        dataRetention
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-zinc-800">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Settings className="text-indigo-400" size={24} />
            Workspace & Routing Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure default model selection, strict zero-charge policies, and credential security.
          </p>
        </div>

        {/* Free-Only Enforcement Section */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <ShieldCheck className="text-emerald-400" size={20} />
            <h2>Free-Only Routing Policy (Server-Enforced)</h2>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="space-y-1">
              <strong className="text-sm text-zinc-100 block">Strict Free-Only Mode</strong>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                When enabled, the backend rejects any route that charges for inference. If a paid model like MiniMax M2.7 is requested, it will never initiate paid requests and will automatically route through verified free endpoints.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFreeOnly(!freeOnly)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                freeOnly ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  freeOnly ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="space-y-1">
              <strong className="text-sm text-zinc-100 block">Automatic Free Fallback</strong>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                If the selected model is blocked or rate-limited, automatically fall back to the next verified free model and transparently report the serving model and fallback reason in the response metadata.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAllowFallback(!allowFallback)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                allowFallback ? 'bg-indigo-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  allowFallback ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Model Preferences Section */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Zap className="text-indigo-400" size={20} />
            <h2>Default AI Model & Provider Preferences</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Default Model for New Chats
              </label>
              <select
                value={defaultModel}
                onChange={e => setDefaultModel(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.providerDisplayName})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">
                MiniMax M2.7 is the primary default. In Free-Only mode, it safely falls back to verified free alternatives.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Preferred Provider
              </label>
              <select
                value={preferredProvider}
                onChange={e => setPreferredProvider(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="openrouter">OpenRouter (Primary / MiniMax host)</option>
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq LPU</option>
                <option value="cerebras">Cerebras</option>
                <option value="cloudflare">Cloudflare Workers AI</option>
                <option value="github">GitHub Models</option>
                <option value="huggingface">Hugging Face</option>
                <option value="ollama">Ollama (Local)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & Credential Audit Card */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Lock className="text-emerald-400" size={20} />
            <h2>Security Architecture Audit</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 uppercase font-semibold text-[10px]">Server-Side Secrets</span>
              <p className="text-emerald-400 font-medium">100% Protected</p>
              <p className="text-zinc-400 text-[11px]">API keys are stored exclusively on the server and never sent to browser bundles.</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 uppercase font-semibold text-[10px]">SSRF Protection</span>
              <p className="text-emerald-400 font-medium">Active & Enforced</p>
              <p className="text-zinc-400 text-[11px]">Cloud metadata (169.254.169.254) and internal networks are blocked from custom URLs.</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 uppercase font-semibold text-[10px]">Data Retention</span>
              <p className="text-indigo-300 font-medium">Local Persistent</p>
              <p className="text-zinc-400 text-[11px]">Conversations are persisted in local server storage and can be cleared anytime.</p>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg disabled:opacity-50"
          >
            {saved ? (
              <>
                <Check size={16} />
                <span>Settings Saved!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
