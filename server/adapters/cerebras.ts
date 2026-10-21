/**
 * Open Agent OS - Cerebras Provider Adapter
 */
import { ProviderAdapter, ProviderError, parseSSEStream } from './base.js';
import { ModelDefinition, GenerateOptions, NormalizedChunk } from '../types.js';
import { storage } from '../storage.js';

export class CerebrasAdapter implements ProviderAdapter {
  providerId = 'cerebras' as const;
  private baseUrl = 'https://api.cerebras.ai/v1';

  private getApiKey(): string | undefined {
    const sec = storage.getProviderSecret(this.providerId);
    return sec?.apiKey;
  }

  private getHeaders(apiKey?: string): Record<string, string> {
    const key = apiKey || this.getApiKey();
    return {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {})
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const key = this.getApiKey();
    if (!key) {
      return { success: false, message: 'Cerebras API key is not configured.' };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(key)
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        if (res.status === 401) return { success: false, message: 'Invalid Cerebras API key.', latencyMs };
        return { success: false, message: `Cerebras HTTP ${res.status}`, latencyMs };
      }

      return { success: true, message: 'Connected to Cerebras Wafer-Scale Inference', latencyMs };
    } catch (err: any) {
      return { success: false, message: `Cerebras connection error: ${err.message}` };
    }
  }

  async discoverModels(): Promise<ModelDefinition[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as any;
      const list = Array.isArray(data?.data) ? data.data : [];

      return list.map((m: any) => ({
        id: m.id,
        name: `${m.id} (Cerebras)`,
        provider: 'cerebras',
        providerDisplayName: 'Cerebras',
        contextWindow: 8192,
        capabilities: {
          coding: true,
          reasoning: Boolean(m.id.includes('70b')),
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
        description: `Ultra-high speed inference on Cerebras CS-3 for ${m.id}`,
        statusMessage: 'Ready — Free Developer Tier (30 RPM)'
      }));
    } catch {
      return [];
    }
  }

  async generate(modelId: string, options: GenerateOptions): Promise<{ text: string; actualModel?: string; tokenUsage?: any }> {
    const key = this.getApiKey();
    if (!key) throw new ProviderError('Cerebras API key is required.', 'NO_KEY', 401, this.providerId, false, true);

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(key),
      body: JSON.stringify({
        model: modelId,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: false
      }),
      signal: options.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsed = errText;
      try { parsed = JSON.parse(errText).error?.message || errText; } catch {}
      const isQuota = res.status === 429;
      throw new ProviderError(`Cerebras Error (${res.status}): ${parsed}`, 'API_ERROR', res.status, this.providerId, isQuota);
    }

    const data = await res.json() as any;
    return {
      text: data?.choices?.[0]?.message?.content || '',
      actualModel: data?.model || modelId,
      tokenUsage: data?.usage
    };
  }

  async stream(
    modelId: string,
    options: GenerateOptions,
    onChunk: (chunk: NormalizedChunk) => void
  ): Promise<{ actualModel?: string; tokenUsage?: any; finishReason?: string }> {
    const key = this.getApiKey();
    if (!key) throw new ProviderError('Cerebras API key is required.', 'NO_KEY', 401, this.providerId, false, true);

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(key),
      body: JSON.stringify({
        model: modelId,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: true
      }),
      signal: options.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsed = errText;
      try { parsed = JSON.parse(errText).error?.message || errText; } catch {}
      const isQuota = res.status === 429;
      throw new ProviderError(`Cerebras Stream Error (${res.status}): ${parsed}`, 'API_ERROR', res.status, this.providerId, isQuota);
    }

    let actualModel = modelId;
    let finishReason: string | undefined;
    let tokenUsage: any;

    await parseSSEStream(res, (payload) => {
      if (payload === '[DONE]') {
        onChunk({ text: '', done: true, finishReason, actualModel, tokenUsage });
        return;
      }

      try {
        const data = JSON.parse(payload);
        if (data.model) actualModel = data.model;
        if (data.usage) tokenUsage = data.usage;

        const choice = data.choices?.[0];
        const delta = choice?.delta?.content || '';
        if (choice?.finish_reason) finishReason = choice.finish_reason;

        if (delta) {
          onChunk({ text: delta, done: false, actualModel });
        }
      } catch {}
    }, options.signal);

    return { actualModel, tokenUsage, finishReason };
  }
}
