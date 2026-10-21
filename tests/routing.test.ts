/**
 * Open Agent OS - Automated Test Suite
 * Tests: Default model, Free-Only security, Routing Engine, Fallback, SSRF protection
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { modelRegistry, CANONICAL_DEFAULT_MODEL_ID } from '../server/registry/models.js';
import { storage } from '../server/storage.js';
import { RoutingEngine } from '../server/router.js';
import { validateSafeUrl } from '../server/adapters/base.js';

describe('Open Agent OS - Core Acceptance Tests', () => {
  let router: RoutingEngine;

  beforeEach(() => {
    router = new RoutingEngine();
    // Reset to default preferences
    storage.updatePreferences({
      defaultModel: CANONICAL_DEFAULT_MODEL_ID,
      preferredProvider: 'openrouter',
      freeOnly: true,
      allowFallback: true
    });
  });

  describe('1. Default Model: MiniMax M2.7', () => {
    it('has MiniMax M2.7 as the default model in preferences', () => {
      const prefs = storage.getPreferences();
      expect(prefs.defaultModel).toBe('minimax/minimax-m2.7');
      expect(prefs.preferredProvider).toBe('openrouter');
    });

    it('has MiniMax M2.7 registered with canonical details in the model catalog', () => {
      const model = modelRegistry.getModel('minimax/minimax-m2.7');
      expect(model).toBeDefined();
      expect(model?.name).toBe('MiniMax M2.7');
      expect(model?.provider).toBe('openrouter');
      expect(model?.pricing.promptCostPerMillion).toBeGreaterThan(0);
      expect(model?.freeEligibility).toBe('paid');
    });

    it('preserves user preferred model selection even when fallback occurs', () => {
      // In free-only mode, MiniMax M2.7 falls back to a verified free model
      const decision = router.resolveRoute('minimax/minimax-m2.7', 'openrouter');
      expect(decision.fallbackOccurred).toBe(true);
      expect(decision.fallbackReason).toContain('paid');
      // The preferences default model remains MiniMax M2.7
      expect(storage.getPreferences().defaultModel).toBe('minimax/minimax-m2.7');
    });
  });

  describe('2. Strict Free-Only Security Policy', () => {
    it('has freeOnly enabled by default', () => {
      const prefs = storage.getPreferences();
      expect(prefs.freeOnly).toBe(true);
    });

    it('rejects paid endpoints in Free-Only mode when fallback is disabled', () => {
      storage.updatePreferences({ freeOnly: true, allowFallback: false });
      expect(() => {
        router.resolveRoute('minimax/minimax-m2.7', 'openrouter');
      }).toThrow(/Blocked by Free-Only policy|Free-Only policy blocked/i);
    });

    it('accurately distinguishes verified_free from paid models', () => {
      const freeModel = modelRegistry.getModel('meta-llama/llama-3.3-70b-instruct:free');
      expect(freeModel?.freeEligibility).toBe('verified_free');
      expect(freeModel?.pricing.isFree).toBe(true);

      const paidModel = modelRegistry.getModel('minimax/minimax-m2.7');
      expect(paidModel?.freeEligibility).toBe('paid');
      expect(paidModel?.pricing.isFree).toBe(false);

      const checkFree = modelRegistry.isFreeEligible('meta-llama/llama-3.3-70b-instruct:free');
      expect(checkFree.eligible).toBe(true);
      expect(checkFree.status).toBe('verified_free');

      const checkPaid = modelRegistry.isFreeEligible('minimax/minimax-m2.7');
      expect(checkPaid.eligible).toBe(false);
      expect(checkPaid.status).toBe('paid');
    });

    it('does not treat unknown pricing as free', () => {
      modelRegistry.upsertModel({
        id: 'test/unknown-model',
        name: 'Unknown Model',
        provider: 'openrouter',
        providerDisplayName: 'OpenRouter',
        capabilities: { coding: true, reasoning: false, toolCalling: false, vision: false, audio: false, embeddings: false },
        pricing: { promptCostPerMillion: 0, completionCostPerMillion: 0, isFree: false, pricingSource: 'unknown', pricingVerifiedAt: new Date().toISOString() },
        freeEligibility: 'unknown'
      });

      const check = modelRegistry.isFreeEligible('test/unknown-model');
      expect(check.eligible).toBe(false);
      expect(check.status).toBe('unknown');
    });

    it('never uses paid endpoints as automatic fallbacks', () => {
      const fallback = router.findBestFreeFallback();
      expect(fallback).not.toBeNull();
      if (fallback) {
        const fallbackDef = modelRegistry.getModel(fallback.id);
        expect(fallbackDef?.freeEligibility === 'verified_free' || fallbackDef?.freeEligibility === 'free_with_limits').toBe(true);
        expect(fallbackDef?.freeEligibility).not.toBe('paid');
      }
    });
  });

  describe('3. Credential Security & SSRF Protection', () => {
    it('blocks cloud metadata IP 169.254.169.254 in safe URL validation', () => {
      expect(validateSafeUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(validateSafeUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
    });

    it('blocks internal private IPs for remote endpoints', () => {
      expect(validateSafeUrl('http://192.168.1.1:8080/v1', false)).toBe(false);
      expect(validateSafeUrl('http://10.0.0.5/v1', false)).toBe(false);
    });

    it('allows valid external URLs and explicitly permitted local URLs', () => {
      expect(validateSafeUrl('https://api.openai.com/v1', false)).toBe(true);
      expect(validateSafeUrl('http://localhost:11434', true)).toBe(true);
    });
  });
});
