/**
 * Open Agent OS - Strict Free-Only Routing Engine
 */
import { modelRegistry, CANONICAL_DEFAULT_MODEL_ID } from './registry/models.js';
import { storage } from './storage.js';
import { adapterManager } from './adapters/index.js';
import {
  GenerateOptions,
  NormalizedChunk,
  ProviderId,
  ResponseMetadata,
  FreeEligibility
} from './types.js';
import { ProviderError } from './adapters/base.js';

export interface RouteDecision {
  targetModelId: string;
  targetProvider: ProviderId;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  freeEligibility: FreeEligibility;
}

export class RoutingEngine {
  /**
   * Evaluates the routing decision based on user preferences and model free eligibility.
   */
  resolveRoute(requestedModelId: string, requestedProvider: ProviderId): RouteDecision {
    const prefs = storage.getPreferences();
    const model = modelRegistry.getModel(requestedModelId);

    const isFreeOnly = prefs.freeOnly;

    // 1. Check if model exists
    if (!model) {
      if (isFreeOnly && prefs.allowFallback) {
        const fallback = this.findBestFreeFallback();
        if (fallback) {
          return {
            targetModelId: fallback.id,
            targetProvider: fallback.provider,
            fallbackOccurred: true,
            fallbackReason: `Requested model "${requestedModelId}" not found. Routed to verified free alternative.`,
            freeEligibility: fallback.freeEligibility
          };
        }
      }
      throw new Error(`Model "${requestedModelId}" is not available in the registry.`);
    }

    // 2. Validate Free-Only policy
    if (isFreeOnly) {
      const freeCheck = modelRegistry.isFreeEligible(model.id);

      if (!freeCheck.eligible) {
        // Model is paid or unknown. If user allows fallback, find verified free alternative
        if (prefs.allowFallback) {
          const fallback = this.findBestFreeFallback([model.id]);
          if (fallback) {
            return {
              targetModelId: fallback.id,
              targetProvider: fallback.provider,
              fallbackOccurred: true,
              fallbackReason: freeCheck.reason || `Model "${model.name}" is paid. Free-Only Mode routed to verified free model "${fallback.name}".`,
              freeEligibility: fallback.freeEligibility
            };
          }
        }

        // No fallback allowed or no free fallback found
        throw new Error(
          freeCheck.reason ||
          `Free-Only policy blocked "${model.name}". This is a paid endpoint. Please enable paid inference or choose a verified free model.`
        );
      }

      // Check if provider credentials exist
      if (!storage.hasProviderSecret(model.provider) && model.provider !== 'ollama') {
        if (prefs.allowFallback) {
          const fallbackWithKey = this.findConfiguredFreeFallback([model.id]);
          if (fallbackWithKey) {
            return {
              targetModelId: fallbackWithKey.id,
              targetProvider: fallbackWithKey.provider,
              fallbackOccurred: true,
              fallbackReason: `Provider "${model.providerDisplayName}" is not configured. Routed to configured free provider "${fallbackWithKey.providerDisplayName}".`,
              freeEligibility: fallbackWithKey.freeEligibility
            };
          }
        }

        throw new Error(`Provider "${model.providerDisplayName}" is not configured. Please enter your API key in Settings.`);
      }

      return {
        targetModelId: model.id,
        targetProvider: model.provider,
        fallbackOccurred: false,
        freeEligibility: model.freeEligibility
      };
    }

    // If free-only is disabled, allow paid model if provider is configured
    if (!storage.hasProviderSecret(model.provider) && model.provider !== 'ollama') {
      throw new Error(`Provider "${model.providerDisplayName}" is not configured.`);
    }

    return {
      targetModelId: model.id,
      targetProvider: model.provider,
      fallbackOccurred: false,
      freeEligibility: model.freeEligibility
    };
  }

  /**
   * Finds the best verified free alternative model.
   * Prioritizes configured providers first, then OpenRouter free models / Gemini / Groq.
   */
  findBestFreeFallback(excludeIds: string[] = []): { id: string; provider: ProviderId; name: string; providerDisplayName: string; freeEligibility: FreeEligibility } | null {
    // 1. Try to find a free model on an already-configured provider
    const configuredFallback = this.findConfiguredFreeFallback(excludeIds);
    if (configuredFallback) return configuredFallback;

    // 2. Otherwise return the top verified free model candidate
    const freeModels = modelRegistry.getVerifiedFreeModels()
      .filter(m => !excludeIds.includes(m.id));

    if (freeModels.length > 0) {
      const top = freeModels[0];
      return {
        id: top.id,
        provider: top.provider,
        name: top.name,
        providerDisplayName: top.providerDisplayName,
        freeEligibility: top.freeEligibility
      };
    }

    return null;
  }

  private findConfiguredFreeFallback(excludeIds: string[] = []): { id: string; provider: ProviderId; name: string; providerDisplayName: string; freeEligibility: FreeEligibility } | null {
    const freeModels = modelRegistry.getVerifiedFreeModels()
      .filter(m => !excludeIds.includes(m.id));

    // Check configured providers
    for (const m of freeModels) {
      if (storage.hasProviderSecret(m.provider) || m.provider === 'ollama') {
        return {
          id: m.id,
          provider: m.provider,
          name: m.name,
          providerDisplayName: m.providerDisplayName,
          freeEligibility: m.freeEligibility
        };
      }
    }

    return null;
  }

  /**
   * Executes streaming with fallback resilience and accurate response metadata.
   */
  async executeStream(
    requestedModelId: string,
    requestedProvider: ProviderId,
    options: GenerateOptions,
    onChunk: (chunk: NormalizedChunk) => void
  ): Promise<ResponseMetadata> {
    const startTime = Date.now();
    const requestId = 'req_' + Math.random().toString(36).substring(2, 11);

    // Initial route resolution
    const route = this.resolveRoute(requestedModelId, requestedProvider);

    let currentModelId = route.targetModelId;
    let currentProvider = route.targetProvider;
    let fallbackOccurred = route.fallbackOccurred;
    let fallbackReason = route.fallbackReason;
    let freeEligibility = route.freeEligibility;

    const attemptedModels = new Set<string>([requestedModelId, currentModelId]);

    // Bounded execution with single fallback attempt on recoverable failure
    let streamResult: { actualModel?: string; tokenUsage?: any; finishReason?: string } | null = null;
    let lastError: Error | null = null;

    try {
      const adapter = adapterManager.getAdapter(currentProvider);
      if (!adapter) throw new Error(`No adapter found for provider "${currentProvider}"`);

      streamResult = await adapter.stream(currentModelId, options, onChunk);
    } catch (err: any) {
      lastError = err;
      const isRecoverable = err instanceof ProviderError && (err.isQuota || err.status === 429 || err.status === 503 || err.status === 502);

      const prefs = storage.getPreferences();
      if (prefs.allowFallback && isRecoverable) {
        // Try fallback
        const nextFallback = this.findBestFreeFallback(Array.from(attemptedModels));
        if (nextFallback) {
          fallbackOccurred = true;
          fallbackReason = `Error from ${currentModelId} (${err.message}). Recovered via free fallback to ${nextFallback.name}.`;
          currentModelId = nextFallback.id;
          currentProvider = nextFallback.provider;
          freeEligibility = nextFallback.freeEligibility;

          const fallbackAdapter = adapterManager.getAdapter(currentProvider);
          if (fallbackAdapter) {
            onChunk({ text: `\n\n*[Notice: Switched to verified free model "${nextFallback.name}" due to provider rate limit.]*\n\n`, done: false });
            streamResult = await fallbackAdapter.stream(currentModelId, options, onChunk);
            lastError = null;
          }
        }
      }
    }

    if (lastError && !streamResult) {
      throw lastError;
    }

    const latencyMs = Date.now() - startTime;
    const modelDef = modelRegistry.getModel(currentModelId);

    const metadata: ResponseMetadata = {
      requestId,
      requestedModel: requestedModelId,
      actualModel: streamResult?.actualModel || currentModelId,
      provider: currentProvider,
      providerDisplayName: modelDef?.providerDisplayName || currentProvider,
      fallbackOccurred,
      fallbackReason,
      latencyMs,
      tokenUsage: streamResult?.tokenUsage,
      freeEligibility,
      finishReason: streamResult?.finishReason || 'stop',
      timestamp: new Date().toISOString()
    };

    return metadata;
  }
}

export const routingEngine = new RoutingEngine();
