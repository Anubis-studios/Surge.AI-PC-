/**
 * Open Agent OS - OpenRouter Provider Adapter
 */
import { ProviderAdapter, ProviderError, parseSSEStream } from './base.js';
import { ModelDefinition, GenerateOptions, NormalizedChunk } from '../types.js';
import { storage } from '../storage.js';

export class OpenRouterAdapter implements ProviderAdapter {
  providerId = 'openrouter' as const;
  private baseUrl = 'https://openrouter.ai/api/v1';

  private getApiKey(): string | undefined {
    const sec = storage.getProviderSecret(this.providerId);
    return sec?.apiKey;
  }

  private getHeaders(apiKey?: string): Record<string, string> {
    const key = apiKey || this.getApiKey();
    return {
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://openagent.os',
      'X-Title': 'Open Agent OS',
      ...(key ? { Authorization: `Bearer ${key}` } : {})
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const key = this.getApiKey();
    if (!key) {
      return { success: false, message: 'OpenRouter API key is not configured.' };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/auth/key`, {
        method: 'GET',
        headers: this.getHeaders(key)
      });

      const latencyMs = Date.now() - start;
      if (!res.ok) {
        if (res.status === 401) {
          return { success: false, message: 'Invalid OpenRouter API key.', latencyMs };
        }
        return { success: false, message: `OpenRouter returned HTTP ${res.status}`, latencyMs };
      }

      const data = await res.json() as any;
      const label = data?.data?.label || 'Account active';
      const limit = data?.data?.limit != null ? ` (Limit: $${data.data.limit})` : '';
      return {
        success: true,
        message: `Connected: ${label}${limit}`,
        latencyMs
      };
    } catch (err: any) {
      return { success: false, message: `Connection error: ${err.message}` };
    }
  }

  async discoverModels(): Promise<ModelDefinition[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch OpenRouter catalog: HTTP ${res.status}`);
      }

      const json = await res.json() as any;
      const rawList = Array.isArray(json?.data) ? json.data : [];

      const discovered: ModelDefinition[] = [];

      for (const item of rawList) {
        const id = item.id;
        const promptCost = parseFloat(item.pricing?.prompt || '0');
        const completionCost = parseFloat(item.pricing?.completion || '0');
        const isFree = promptCost === 0 && completionCost === 0;
        const isFreeTag = id.includes(':free') || id === 'openrouter/free';

        const isMiniMax = id.toLowerCase().includes('minimax');

        let freeEligibility: ModelDefinition['freeEligibility'] = 'paid';
        if (isFree || isFreeTag) {
          freeEligibility = 'verified_free';
        } else if (isMiniMax) {
          freeEligibility = 'paid';
        } else {
          freeEligibility = 'paid';
        }

        const isM27 = id === 'minimax/minimax-m2.7';

        discovered.push({
          id,
          name: item.name || id,
          provider: 'openrouter',
          providerDisplayName: 'OpenRouter',
          contextWindow: item.context_length || 128000,
          capabilities: {
            coding: Boolean(item.description?.toLowerCase().includes('code') || id.includes('code') || isM27 || id.includes('llama') || id.includes('claude')),
            reasoning: Boolean(item.description?.toLowerCase().includes('reason') || isM27 || id.includes('70b') || id.includes('r1')),
            toolCalling: Boolean(item.tools_support || id.includes('instruct') || isM27),
            vision: Boolean(item.architecture?.modality?.includes('image->') || id.includes('vision') || id.includes('flash')),
            audio: false,
            embeddings: false
          },
          pricing: {
            promptCostPerMillion: promptCost * 1_000_000,
            completionCostPerMillion: completionCost * 1_000_000,
            isFree: isFree || isFreeTag,
            pricingSource: 'provider_api',
            pricingVerifiedAt: new Date().toISOString()
          },
          freeEligibility,
          description: item.description || '',
          statusMessage: isFree || isFreeTag 
            ? 'Ready — Verified Free ($0.00 / 1M tokens)' 
            : `Paid endpoint ($${(promptCost * 1_000_000).toFixed(2)} / 1M prompt tokens)`
        });
      }

      return discovered;
    } catch (err: any) {
      console.warn('OpenRouter discovery warning:', err.message);
      return [];
    }
  }

  async generate(modelId: string, options: GenerateOptions): Promise<{ text: string; actualModel?: string; tokenUsage?: any }> {
    const key = this.getApiKey();
    if (!key) {
      throw new ProviderError('OpenRouter API key is required.', 'NO_KEY', 401, this.providerId, false, true);
    }

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
      const errBody = await res.text();
      let parsedMsg = errBody;
      try {
        const parsed = JSON.parse(errBody);
        parsedMsg = parsed.error?.message || errBody;
      } catch {}

      const isQuota = res.status === 429 || parsedMsg.toLowerCase().includes('credits') || parsedMsg.toLowerCase().includes('quota');
      throw new ProviderError(`OpenRouter Error (${res.status}): ${parsedMsg}`, 'API_ERROR', res.status, this.providerId, isQuota);
    }

    const data = await res.json() as any;
    const choice = data?.choices?.[0];
    const text = choice?.message?.content || '';
    const actualModel = data?.model || modelId;

    return {
      text,
      actualModel,
      tokenUsage: {
        promptTokens: data?.usage?.prompt_tokens,
        completionTokens: data?.usage?.completion_tokens,
        totalTokens: data?.usage?.total_tokens
      }
    };
  }

  async stream(
    modelId: string,
    options: GenerateOptions,
    onChunk: (chunk: NormalizedChunk) => void
  ): Promise<{ actualModel?: string; tokenUsage?: any; finishReason?: string }> {
    const key = this.getApiKey();
    if (!key) {
      throw new ProviderError('OpenRouter API key is required for streaming.', 'NO_KEY', 401, this.providerId, false, true);
    }

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
      const errBody = await res.text();
      let parsedMsg = errBody;
      try {
        const parsed = JSON.parse(errBody);
        parsedMsg = parsed.error?.message || errBody;
      } catch {}
      const isQuota = res.status === 429 || parsedMsg.toLowerCase().includes('credits');
      throw new ProviderError(`OpenRouter Stream Error (${res.status}): ${parsedMsg}`, 'API_ERROR', res.status, this.providerId, isQuota);
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
      } catch {
        // ignore parse error for individual SSE chunks
      }
    }, options.signal);

    return { actualModel, tokenUsage, finishReason };
  }
}
