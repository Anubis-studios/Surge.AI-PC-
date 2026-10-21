/**
 * Open Agent OS - Adapter Registry & Manager
 */
import { ProviderAdapter } from './base.js';
import { ProviderId } from '../types.js';
import { OpenRouterAdapter } from './openrouter.js';
import { GeminiAdapter } from './gemini.js';
import { GroqAdapter } from './groq.js';
import { CerebrasAdapter } from './cerebras.js';
import { CloudflareAdapter } from './cloudflare.js';
import { GitHubModelsAdapter } from './github.js';
import { HuggingFaceAdapter } from './huggingface.js';
import { OllamaAdapter } from './ollama.js';
import { GenericOpenAIAdapter } from './generic-openai.js';

class AdapterManager {
  private adapters: Map<ProviderId, ProviderAdapter> = new Map();

  constructor() {
    this.adapters.set('openrouter', new OpenRouterAdapter());
    this.adapters.set('gemini', new GeminiAdapter());
    this.adapters.set('groq', new GroqAdapter());
    this.adapters.set('cerebras', new CerebrasAdapter());
    this.adapters.set('cloudflare', new CloudflareAdapter());
    this.adapters.set('github', new GitHubModelsAdapter());
    this.adapters.set('huggingface', new HuggingFaceAdapter());
    this.adapters.set('ollama', new OllamaAdapter());
    this.adapters.set('custom_openai', new GenericOpenAIAdapter());
  }

  getAdapter(providerId: ProviderId): ProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  getAllAdapters(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const adapterManager = new AdapterManager();
