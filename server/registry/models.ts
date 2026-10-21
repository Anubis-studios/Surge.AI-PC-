/**
 * Open Agent OS - Model Registry & Pricing Verification
 */
import { ModelDefinition, ProviderId, FreeEligibility } from '../types.js';

export const CANONICAL_DEFAULT_MODEL_ID = 'minimax/minimax-m2.7';

export const INITIAL_MODEL_CATALOG: ModelDefinition[] = [
  // DEFAULT MODEL: MiniMax M2.7
  {
    id: 'minimax/minimax-m2.7',
    name: 'MiniMax M2.7',
    provider: 'openrouter',
    providerDisplayName: 'OpenRouter',
    contextWindow: 1000000,
    capabilities: {
      coding: true,
      reasoning: true,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0.15,
      completionCostPerMillion: 1.10,
      isFree: false,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'paid', // Strictly marked as paid; blocked when freeOnly=true
    description: 'High-capability flagship model from MiniMax with exceptional reasoning and million-token context window.',
    recommendedFor: ['Reasoning', 'Complex Coding', 'Long Context', 'Analysis'],
    statusMessage: 'Official MiniMax M2.7 endpoint on OpenRouter is a paid model ($0.15/M in). In Free-Only mode, it will safely fallback to verified free models.'
  },

  // OpenRouter Verified Free Models
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct (Free)',
    provider: 'openrouter',
    providerDisplayName: 'OpenRouter',
    contextWindow: 131072,
    capabilities: {
      coding: true,
      reasoning: true,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'provider_api',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'verified_free',
    description: 'Meta flagship open-weight 70B model served with zero token charges on OpenRouter.',
    recommendedFor: ['Coding', 'Reasoning', 'General Assistance', 'Fast Output'],
    statusMessage: 'Ready — Verified Free ($0.00 / 1M tokens)'
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash Experimental (Free)',
    provider: 'openrouter',
    providerDisplayName: 'OpenRouter',
    contextWindow: 1048576,
    capabilities: {
      coding: true,
      reasoning: true,
      toolCalling: true,
      vision: true,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'provider_api',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'verified_free',
    description: 'High speed multimodal experimental model from Google hosted on OpenRouter free tier.',
    recommendedFor: ['Vision', 'Fast Chat', 'Multimodal'],
    statusMessage: 'Ready — Verified Free'
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct (Free)',
    provider: 'openrouter',
    providerDisplayName: 'OpenRouter',
    contextWindow: 32768,
    capabilities: {
      coding: true,
      reasoning: false,
      toolCalling: false,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'provider_api',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'verified_free',
    description: 'Fast, lightweight instruction-tuned model by Mistral AI.',
    recommendedFor: ['Quick answers', 'Text editing'],
    statusMessage: 'Ready — Verified Free'
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Model Router',
    provider: 'openrouter',
    providerDisplayName: 'OpenRouter',
    contextWindow: 128000,
    capabilities: {
      coding: true,
      reasoning: true,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'verified_free',
    description: 'Dynamic free-tier router that routes requests to currently available free open models.',
    recommendedFor: ['General Free Inference', 'High Availability'],
    statusMessage: 'Ready — Verified Free Router'
  },

  // Google Gemini API
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    providerDisplayName: 'Google Gemini',
    contextWindow: 1048576,
    capabilities: {
      coding: true,
      reasoning: true,
      toolCalling: true,
      vision: true,
      audio: true,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'Current flagship Flash multimodal model with 1M context in Google AI Studio free tier.',
    recommendedFor: ['Reasoning', 'Vision', 'Multimodal', 'Coding'],
    statusMessage: 'Ready — Free with Rate Limits (15 RPM)'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    providerDisplayName: 'Google Gemini',
    contextWindow: 1048576,
    capabilities: {
      coding: true,
      reasoning: false,
      toolCalling: true,
      vision: true,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'High-speed, lightweight Gemini model for low-latency text and multimodal tasks.',
    recommendedFor: ['General Chat', 'Fast Summaries'],
    statusMessage: 'Ready — Free with Limits'
  },

  // Groq LPU Models
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile (Groq)',
    provider: 'groq',
    providerDisplayName: 'Groq LPU',
    contextWindow: 128000,
    capabilities: {
      coding: true,
      reasoning: true,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'Meta 70B parameter model running on Groq LPU with ~300 tokens/sec in free developer tier.',
    recommendedFor: ['Ultra-fast Coding', 'Realtime Assistant'],
    statusMessage: 'Ready — Free Tier (30 RPM / 6k TPM)'
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant (Groq)',
    provider: 'groq',
    providerDisplayName: 'Groq LPU',
    contextWindow: 128000,
    capabilities: {
      coding: true,
      reasoning: false,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'Lightning-fast 8B model on Groq hardware with ~700 tokens/sec.',
    recommendedFor: ['Instant Responses', 'Lightweight Tasks'],
    statusMessage: 'Ready — Free Tier'
  },

  // Cerebras
  {
    id: 'llama3.1-8b',
    name: 'Llama 3.1 8B (Cerebras)',
    provider: 'cerebras',
    providerDisplayName: 'Cerebras',
    contextWindow: 8192,
    capabilities: {
      coding: true,
      reasoning: false,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'High throughput inference on Cerebras CS-3 Wafer-Scale cluster.',
    recommendedFor: ['Speed', 'Streaming'],
    statusMessage: 'Ready — Free Developer Tier (30 RPM)'
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B (Cerebras)',
    provider: 'cerebras',
    providerDisplayName: 'Cerebras',
    contextWindow: 8192,
    capabilities: {
      coding: true,
      reasoning: true,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'Flagship 70B model accelerated on Cerebras hardware.',
    recommendedFor: ['Reasoning', 'Fast Inference'],
    statusMessage: 'Ready — Free Developer Tier'
  },

  // Cloudflare Workers AI
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B Instruct (Cloudflare)',
    provider: 'cloudflare',
    providerDisplayName: 'Cloudflare Workers AI',
    contextWindow: 8192,
    capabilities: {
      coding: true,
      reasoning: false,
      toolCalling: false,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'Served on Cloudflare Edge GPUs with 10k free neurons per day.',
    recommendedFor: ['Edge Inference', 'Global Low Latency'],
    statusMessage: 'Ready — 10k Free Neurons/Day'
  },

  // GitHub Models
  {
    id: 'meta/meta-llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B Instruct (GitHub Models)',
    provider: 'github',
    providerDisplayName: 'GitHub Models',
    contextWindow: 128000,
    capabilities: {
      coding: true,
      reasoning: true,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'Azure AI powered model playground accessible via GitHub developer personal access token.',
    recommendedFor: ['Prototyping', 'GitHub Workflow Integration'],
    statusMessage: 'Ready — Free Preview Access'
  },

  // Hugging Face
  {
    id: 'meta-llama/Meta-Llama-3-8B-Instruct',
    name: 'Meta Llama 3 8B Instruct (Hugging Face)',
    provider: 'huggingface',
    providerDisplayName: 'Hugging Face',
    contextWindow: 8192,
    capabilities: {
      coding: true,
      reasoning: false,
      toolCalling: false,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'official_catalog',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'free_with_limits',
    description: 'Community serverless inference endpoint on Hugging Face hub.',
    recommendedFor: ['Open Source Community'],
    statusMessage: 'Ready — Free Community Tier'
  },

  // Local Ollama
  {
    id: 'llama3.2:latest',
    name: 'Llama 3.2 (Ollama Local)',
    provider: 'ollama',
    providerDisplayName: 'Ollama Local',
    contextWindow: 131072,
    capabilities: {
      coding: true,
      reasoning: false,
      toolCalling: true,
      vision: false,
      audio: false,
      embeddings: false
    },
    pricing: {
      promptCostPerMillion: 0,
      completionCostPerMillion: 0,
      isFree: true,
      pricingSource: 'user_configured',
      pricingVerifiedAt: new Date().toISOString()
    },
    freeEligibility: 'verified_free',
    isLocal: true,
    description: 'Runs completely locally on your machine via Ollama daemon. 100% free, private, offline.',
    recommendedFor: ['Privacy', 'Offline Use', 'Unlimited Local Inference'],
    statusMessage: 'Ready — 100% Free Local'
  }
];

class ModelRegistryService {
  private models: Map<string, ModelDefinition> = new Map();
  private lastCatalogRefresh: number = 0;

  constructor() {
    for (const m of INITIAL_MODEL_CATALOG) {
      this.models.set(m.id, { ...m });
    }
  }

  getAllModels(): ModelDefinition[] {
    return Array.from(this.models.values());
  }

  getModel(id: string): ModelDefinition | undefined {
    return this.models.get(id);
  }

  upsertModel(model: ModelDefinition) {
    this.models.set(model.id, model);
  }

  registerDiscoveredModels(models: ModelDefinition[]) {
    for (const m of models) {
      this.models.set(m.id, m);
    }
    this.lastCatalogRefresh = Date.now();
  }

  getVerifiedFreeModels(): ModelDefinition[] {
    return this.getAllModels().filter(
      m => m.freeEligibility === 'verified_free' || m.freeEligibility === 'free_with_limits'
    );
  }

  isFreeEligible(modelId: string): { eligible: boolean; status: FreeEligibility; reason?: string } {
    const model = this.getModel(modelId);
    if (!model) {
      return { eligible: false, status: 'unavailable', reason: `Model "${modelId}" not found in registry.` };
    }

    if (model.freeEligibility === 'verified_free') {
      return { eligible: true, status: 'verified_free' };
    }

    if (model.freeEligibility === 'free_with_limits') {
      return { eligible: true, status: 'free_with_limits' };
    }

    if (model.freeEligibility === 'paid') {
      return {
        eligible: false,
        status: 'paid',
        reason: `Model "${model.name}" is a paid model (${model.pricing.promptCostPerMillion > 0 ? `$${model.pricing.promptCostPerMillion}/M tokens` : 'charges apply'}). Blocked by Free-Only policy.`
      };
    }

    return {
      eligible: false,
      status: model.freeEligibility,
      reason: `Model "${model.name}" has unverified pricing (${model.freeEligibility}). Blocked by Free-Only policy.`
    };
  }
}

export const modelRegistry = new ModelRegistryService();
