/**
 * Open Agent OS - Ollama (Local Inference) Adapter
 */
import { ProviderAdapter, ProviderError, parseSSEStream } from './base.js';
import { ModelDefinition, GenerateOptions, NormalizedChunk } from '../types.js';
import { storage } from '../storage.js';

export class OllamaAdapter implements ProviderAdapter {
  providerId = 'ollama' as const;

  private getBaseUrl(): string {
    const sec = storage.getProviderSecret(this.providerId);
    return sec?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const baseUrl = this.getBaseUrl();
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000)
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return { success: false, message: `Ollama returned HTTP ${res.status}`, latencyMs };
      }

      const data = await res.json() as any;
      const count = Array.isArray(data?.models) ? data.models.length : 0;
      return { success: true, message: `Connected to Local Ollama (${count} local models installed)`, latencyMs };
    } catch (err: any) {
      return { success: false, message: `Local Ollama is not running on ${baseUrl}` };
    }
  }

  async discoverModels(): Promise<ModelDefinition[]> {
    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) return [];
      const data = await res.json() as any;
      const list = Array.isArray(data?.models) ? data.models : [];

      return list.map((m: any) => ({
        id: m.name,
        name: `${m.name} (Local)`,
        provider: 'ollama',
        providerDisplayName: 'Ollama Local',
        contextWindow: 131072,
        capabilities: {
          coding: true,
          reasoning: Boolean(m.name.includes('deepseek') || m.name.includes('r1')),
          toolCalling: true,
          vision: Boolean(m.name.includes('llava') || m.name.includes('vision')),
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
        description: `Local model running offline on your hardware (${m.details?.parameter_size || 'local weights'})`,
        statusMessage: 'Ready — 100% Free Local'
      }));
    } catch {
      return [];
    }
  }

  async generate(modelId: string, options: GenerateOptions): Promise<{ text: string; actualModel?: string; tokenUsage?: any }> {
    const baseUrl = this.getBaseUrl();
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: options.messages,
        stream: false
      }),
      signal: options.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new ProviderError(`Ollama Error (${res.status}): ${errText}`, 'API_ERROR', res.status, this.providerId);
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
    const baseUrl = this.getBaseUrl();
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: options.messages,
        stream: true
      }),
      signal: options.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new ProviderError(`Ollama Stream Error (${res.status}): ${errText}`, 'API_ERROR', res.status, this.providerId);
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
