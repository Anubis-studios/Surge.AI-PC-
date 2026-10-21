/**
 * Open Agent OS - Generic OpenAI-Compatible Provider Adapter
 */
import { ProviderAdapter, ProviderError, parseSSEStream, validateSafeUrl } from './base.js';
import { ModelDefinition, GenerateOptions, NormalizedChunk } from '../types.js';
import { storage } from '../storage.js';

export class GenericOpenAIAdapter implements ProviderAdapter {
  providerId = 'custom_openai' as const;

  private getConfig() {
    const sec = storage.getProviderSecret(this.providerId);
    return {
      baseUrl: sec?.baseUrl || 'http://localhost:1234/v1',
      apiKey: sec?.apiKey
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const { baseUrl, apiKey } = this.getConfig();
    if (!baseUrl) return { success: false, message: 'Base URL is required.' };

    if (!validateSafeUrl(baseUrl, true)) {
      return { success: false, message: 'Invalid or blocked Base URL (SSRF protection enabled).' };
    }

    const start = Date.now();
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
        headers,
        signal: AbortSignal.timeout(4000)
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return { success: false, message: `Endpoint returned HTTP ${res.status}`, latencyMs };
      }

      return { success: true, message: 'Connected to custom OpenAI-compatible endpoint', latencyMs };
    } catch (err: any) {
      return { success: false, message: `Failed to connect: ${err.message}` };
    }
  }

  async discoverModels(): Promise<ModelDefinition[]> {
    const { baseUrl, apiKey } = this.getConfig();
    if (!baseUrl || !validateSafeUrl(baseUrl, true)) return [];

    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
        headers,
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) return [];
      const data = await res.json() as any;
      const list = Array.isArray(data?.data) ? data.data : [];

      return list.map((m: any) => ({
        id: m.id,
        name: `${m.id} (Custom)`,
        provider: 'custom_openai',
        providerDisplayName: 'Custom Endpoint',
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
          pricingSource: 'user_configured',
          pricingVerifiedAt: new Date().toISOString()
        },
        freeEligibility: 'verified_free',
        description: `Custom model hosted on ${baseUrl}`,
        statusMessage: 'Ready — Configured Custom Endpoint'
      }));
    } catch {
      return [];
    }
  }

  async generate(modelId: string, options: GenerateOptions): Promise<{ text: string; actualModel?: string; tokenUsage?: any }> {
    const { baseUrl, apiKey } = this.getConfig();
    if (!validateSafeUrl(baseUrl, true)) {
      throw new ProviderError('Blocked Base URL due to security policy.', 'SSRF_BLOCKED', 400, this.providerId);
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
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
      throw new ProviderError(`Custom Endpoint error (${res.status}): ${errText}`, 'API_ERROR', res.status, this.providerId);
    }

    const data = await res.json() as any;
    return {
      text: data?.choices?.[0]?.message?.content || '',
      actualModel: data?.model || modelId
    };
  }

  async stream(
    modelId: string,
    options: GenerateOptions,
    onChunk: (chunk: NormalizedChunk) => void
  ): Promise<{ actualModel?: string; tokenUsage?: any; finishReason?: string }> {
    const { baseUrl, apiKey } = this.getConfig();
    if (!validateSafeUrl(baseUrl, true)) {
      throw new ProviderError('Blocked Base URL due to security policy.', 'SSRF_BLOCKED', 400, this.providerId);
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
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
      throw new ProviderError(`Custom Endpoint Stream Error (${res.status}): ${errText}`, 'API_ERROR', res.status, this.providerId);
    }

    let actualModel = modelId;
    let finishReason: string | undefined;

    await parseSSEStream(res, (payload) => {
      if (payload === '[DONE]') {
        onChunk({ text: '', done: true, finishReason, actualModel });
        return;
      }

      try {
        const data = JSON.parse(payload);
        if (data.model) actualModel = data.model;
        const choice = data.choices?.[0];
        const delta = choice?.delta?.content || '';
        if (choice?.finish_reason) finishReason = choice.finish_reason;

        if (delta) {
          onChunk({ text: delta, done: false, actualModel });
        }
      } catch {}
    }, options.signal);

    return { actualModel, finishReason };
  }
}
