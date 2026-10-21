/**
 * Open Agent OS - Core Type Definitions
 */

export type FreeEligibility = 
  | 'verified_free'
  | 'free_with_limits'
  | 'promotional_credit'
  | 'paid'
  | 'unknown'
  | 'unavailable';

export type ProviderId = 
  | 'openrouter'
  | 'gemini'
  | 'groq'
  | 'cerebras'
  | 'cloudflare'
  | 'github'
  | 'huggingface'
  | 'ollama'
  | 'custom_openai';

export type ConnectionStatus = 
  | 'connected'
  | 'configured'
  | 'setup_required'
  | 'unavailable'
  | 'error';

export interface ModelCapability {
  coding: boolean;
  reasoning: boolean;
  toolCalling: boolean;
  vision: boolean;
  audio: boolean;
  embeddings: boolean;
}

export interface ModelPricing {
  promptCostPerMillion: number;
  completionCostPerMillion: number;
  isFree: boolean;
  pricingSource: 'provider_api' | 'official_catalog' | 'user_configured' | 'unknown';
  pricingVerifiedAt: string;
}

export interface ModelDefinition {
  id: string; // Canonical model ID (e.g. 'minimax/minimax-m2.7')
  name: string; // Human-friendly display name (e.g. 'MiniMax M2.7')
  provider: ProviderId;
  providerDisplayName: string;
  contextWindow?: number;
  capabilities: ModelCapability;
  pricing: ModelPricing;
  freeEligibility: FreeEligibility;
  isLocal?: boolean;
  description?: string;
  recommendedFor?: string[];
  statusMessage?: string;
  lastVerifiedAt?: string;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  description: string;
  website: string;
  docUrl: string;
  requiresKey: boolean;
  hasEnvKey: boolean;
  isConfigured: boolean;
  status: ConnectionStatus;
  statusMessage: string;
  freeTierPolicy: string;
  modelsCount: number;
  lastHealthCheck?: string;
  customBaseUrl?: string;
  supportsStreaming: boolean;
  supportsModelDiscovery: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  requestId: string;
  requestedModel: string;
  actualModel: string;
  provider: ProviderId;
  providerDisplayName: string;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  estimatedCostUsd?: number;
  freeEligibility: FreeEligibility;
  finishReason?: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  selectedModel: string;
  selectedProvider: ProviderId;
}

export interface UserPreferences {
  defaultModel: string; // Default: 'minimax/minimax-m2.7'
  preferredProvider: ProviderId; // Default: 'openrouter'
  freeOnly: boolean; // Default: true (strict backend enforcement)
  allowFallback: boolean; // Default: true (to verified free models only)
  theme: 'dark' | 'light' | 'system';
  dataRetention: 'local' | 'session' | 'persistent';
}

export interface GenerateOptions {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface NormalizedChunk {
  text: string;
  done: boolean;
  finishReason?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  actualModel?: string;
}
