/**
 * Open Agent OS - Base Provider Adapter Interface & Utilities
 */
import { ModelDefinition, GenerateOptions, NormalizedChunk, ProviderId } from '../types.js';

export interface ProviderAdapter {
  providerId: ProviderId;
  testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }>;
  discoverModels(): Promise<ModelDefinition[]>;
  generate(modelId: string, options: GenerateOptions): Promise<{ text: string; actualModel?: string; tokenUsage?: any }>;
  stream(
    modelId: string,
    options: GenerateOptions,
    onChunk: (chunk: NormalizedChunk) => void
  ): Promise<{ actualModel?: string; tokenUsage?: any; finishReason?: string }>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public provider?: ProviderId,
    public isQuota?: boolean,
    public isAuth?: boolean
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * SSRF validator: ensures custom or remote URLs do not target cloud metadata or sensitive private subnets.
 */
export function validateSafeUrl(urlStr: string, allowLocalhost: boolean = false): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();

    // Block cloud metadata services
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname === 'instance-data') {
      return false;
    }

    if (allowLocalhost) {
      return true;
    }

    // Block standard local loopback and private IPs for remote endpoints
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      (hostname.startsWith('172.') && parseInt(hostname.split('.')[1], 10) >= 16 && parseInt(hostname.split('.')[1], 10) <= 31)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to parse Server-Sent Events (SSE) data lines
 */
export async function parseSSEStream(
  response: Response,
  onData: (data: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const body = response.body;
  if (!body) throw new Error('Response body is null');

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6).trim();
          if (payload === '[DONE]') {
            onData('[DONE]');
          } else if (payload) {
            onData(payload);
          }
        }
      }
    }
  } catch (err: any) {
    if (signal?.aborted) return;
    throw err;
  }
}
