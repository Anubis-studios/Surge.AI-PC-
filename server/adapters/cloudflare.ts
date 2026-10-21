/**
 * Open Agent OS - Cloudflare Workers AI Provider Adapter
 */
import { ProviderAdapter, ProviderError, parseSSEStream } from './base.js';
import { ModelDefinition, GenerateOptions, NormalizedChunk } from '../types.js';
import { storage } from '../storage.js';

export class CloudflareAdapter implements ProviderAdapter {
  providerId = 'cloudflare' as const;

  private getCredentials(): { apiKey?: string; accountId?: string } {
    const sec = storage.getProviderSecret(this.providerId);
    return {
      apiKey: sec?.apiKey,
      accountId: sec?.accountId
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const { apiKey, accountId } = this.getCredentials();
    if (!apiKey) return { success: false, message: 'Cloudflare API token is not configured.' };
    if (!accountId) return { success: false, message: 'Cloudflare Account ID is required.' };

    const start = Date.now();
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { success: false, message: 'Invalid Cloudflare API token or insufficient permissions.', latencyMs };
        }
        return { success: false, message: `Cloudflare returned HTTP ${res.status}`, latencyMs };
      }

      return { success: true, message: 'Connected to Cloudflare Workers AI (10k Free Neurons/Day)', latencyMs };
    } catch (err: any) {
      return { success: false, message: `Cloudflare connection error: ${err.message}` };
    }
  }

  async discoverModels(): Promise<ModelDefinition[]> {
    return [
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
        description: 'Serverless Meta Llama 3.1 8B running globally on Cloudflare edge GPUs.',
        statusMessage: 'Ready — 10,000 Free Neurons per Day'
      }
    ];
  }

  async generate(modelId: string, options: GenerateOptions): Promise<{ text: string; actualModel?: string; tokenUsage?: any }> {
    const { apiKey, accountId } = this.getCredentials();
    if (!apiKey || !accountId) throw new ProviderError('Cloudflare API Token and Account ID are required.', 'NO_KEY', 401, this.providerId, false, true);

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: options.messages,
        max_tokens: options.maxTokens ?? 2048
      }),
      signal: options.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new ProviderError(`Cloudflare Workers AI error (${res.status}): ${errText}`, 'API_ERROR', res.status, this.providerId);
    }

    const data = await res.json() as any;
    const text = data?.result?.response || '';
    return { text, actualModel: modelId };
  }

  async stream(
    modelId: string,
    options: GenerateOptions,
    onChunk: (chunk: NormalizedChunk) => void
  ): Promise<{ actualModel?: string; tokenUsage?: any; finishReason?: string }> {
    const { apiKey, accountId } = this.getCredentials();
    if (!apiKey || !accountId) throw new ProviderError('Cloudflare API Token and Account ID are required.', 'NO_KEY', 401, this.providerId, false, true);

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: options.messages,
        stream: true,
        max_tokens: options.maxTokens ?? 2048
      }),
      signal: options.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new ProviderError(`Cloudflare Stream Error (${res.status}): ${errText}`, 'API_ERROR', res.status, this.providerId);
    }

    await parseSSEStream(res, (payload) => {
      if (payload === '[DONE]') {
        onChunk({ text: '', done: true, actualModel: modelId });
        return;
      }

      try {
        const data = JSON.parse(payload);
        const text = data?.response || '';
        if (text) {
          onChunk({ text, done: false, actualModel: modelId });
        }
      } catch {}
    }, options.signal);

    return { actualModel: modelId, finishReason: 'stop' };
  }
}
