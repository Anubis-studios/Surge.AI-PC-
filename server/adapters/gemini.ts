/**
 * Open Agent OS - Google Gemini Provider Adapter
 */
import { GoogleGenAI } from '@google/genai';
import { ProviderAdapter, ProviderError } from './base.js';
import { ModelDefinition, GenerateOptions, NormalizedChunk } from '../types.js';
import { storage } from '../storage.js';

export class GeminiAdapter implements ProviderAdapter {
  providerId = 'gemini' as const;

  private getApiKey(): string | undefined {
    const sec = storage.getProviderSecret(this.providerId);
    return sec?.apiKey;
  }

  private getClient(apiKey?: string): GoogleGenAI {
    const key = apiKey || this.getApiKey();
    if (!key) {
      throw new ProviderError('Google Gemini API key is not configured.', 'NO_KEY', 401, this.providerId, false, true);
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const key = this.getApiKey();
    if (!key) {
      return { success: false, message: 'Gemini API key is not configured.' };
    }

    const start = Date.now();
    try {
      const ai = this.getClient(key);
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Hi'
      });
      const latencyMs = Date.now() - start;
      if (res?.text) {
        return { success: true, message: 'Connected to Gemini API (Free Tier)', latencyMs };
      }
      return { success: true, message: 'Connected to Gemini API', latencyMs };
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('API_KEY_INVALID') || msg.includes('401')) {
        return { success: false, message: 'Invalid Gemini API key.' };
      }
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        return { success: false, message: 'Gemini rate limit or quota exceeded.' };
      }
      return { success: false, message: `Gemini test error: ${msg}` };
    }
  }

  async discoverModels(): Promise<ModelDefinition[]> {
    return [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
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
        description: 'Flagship multimodal Flash model with 1M tokens context and 15 RPM free tier in Google AI Studio.',
        statusMessage: 'Ready — Free with Limits (15 RPM)'
      },
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
        description: 'Fast, state-of-the-art general reasoning and multimodal model.',
        statusMessage: 'Ready — Free with Limits'
      }
    ];
  }

  async generate(modelId: string, options: GenerateOptions): Promise<{ text: string; actualModel?: string; tokenUsage?: any }> {
    const ai = this.getClient();
    try {
      const contents = options.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const res = await ai.models.generateContent({
        model: modelId,
        contents
      });

      return {
        text: res.text || '',
        actualModel: modelId,
        tokenUsage: res.usageMetadata ? {
          promptTokens: res.usageMetadata.promptTokenCount,
          completionTokens: res.usageMetadata.candidatesTokenCount,
          totalTokens: res.usageMetadata.totalTokenCount
        } : undefined
      };
    } catch (err: any) {
      const msg = err.message || String(err);
      const isQuota = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429');
      const isAuth = msg.includes('API_KEY_INVALID') || msg.includes('401');
      throw new ProviderError(`Gemini Error: ${msg}`, isAuth ? 'AUTH_ERROR' : isQuota ? 'QUOTA_EXHAUSTED' : 'API_ERROR', isAuth ? 401 : isQuota ? 429 : 500, this.providerId, isQuota, isAuth);
    }
  }

  async stream(
    modelId: string,
    options: GenerateOptions,
    onChunk: (chunk: NormalizedChunk) => void
  ): Promise<{ actualModel?: string; tokenUsage?: any; finishReason?: string }> {
    const ai = this.getClient();
    try {
      const contents = options.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const streamRes = await ai.models.generateContentStream({
        model: modelId,
        contents
      });

      let tokenUsage: any;

      for await (const chunk of streamRes) {
        if (options.signal?.aborted) break;

        const text = chunk.text || '';
        if (chunk.usageMetadata) {
          tokenUsage = {
            promptTokens: chunk.usageMetadata.promptTokenCount,
            completionTokens: chunk.usageMetadata.candidatesTokenCount,
            totalTokens: chunk.usageMetadata.totalTokenCount
          };
        }

        if (text) {
          onChunk({
            text,
            done: false,
            actualModel: modelId
          });
        }
      }

      onChunk({
        text: '',
        done: true,
        actualModel: modelId,
        tokenUsage
      });

      return {
        actualModel: modelId,
        tokenUsage,
        finishReason: 'stop'
      };
    } catch (err: any) {
      const msg = err.message || String(err);
      const isQuota = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429');
      const isAuth = msg.includes('API_KEY_INVALID') || msg.includes('401');
      throw new ProviderError(`Gemini Stream Error: ${msg}`, isAuth ? 'AUTH_ERROR' : isQuota ? 'QUOTA_EXHAUSTED' : 'API_ERROR', isAuth ? 401 : isQuota ? 429 : 500, this.providerId, isQuota, isAuth);
    }
  }
}
