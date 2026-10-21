/**
 * Open Agent OS - Adapter & Credential Security Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../server/storage.js';
import { OpenRouterAdapter } from '../server/adapters/openrouter.js';
import { GroqAdapter } from '../server/adapters/groq.js';
import { GeminiAdapter } from '../server/adapters/gemini.js';
import { modelRegistry } from '../server/registry/models.js';

describe('Open Agent OS - Provider Adapters & Credential Security', () => {
  beforeEach(() => {
    storage.clearProviderSecret('groq');
  });

  describe('1. Secure Server-Side Credential Handling', () => {
    it('stores provider credentials on server and checks hasProviderSecret correctly', () => {
      expect(storage.hasProviderSecret('groq')).toBe(false);
      storage.setProviderSecret('groq', { apiKey: 'gsk_test_secret_12345' });
      expect(storage.hasProviderSecret('groq')).toBe(true);

      const secret = storage.getProviderSecret('groq');
      expect(secret?.apiKey).toBe('gsk_test_secret_12345');
    });

    it('considers Ollama configured without requiring an API key', () => {
      expect(storage.hasProviderSecret('ollama')).toBe(true);
    });
  });

  describe('2. OpenRouter Adapter & Pricing Logic', () => {
    const adapter = new OpenRouterAdapter();

    it('returns error when testing connection without API key', async () => {
      const res = await adapter.testConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('not configured');
    });

    it('throws NO_KEY ProviderError when generating without credentials', async () => {
      await expect(
        adapter.generate('minimax/minimax-m2.7', { messages: [{ role: 'user', content: 'test' }] })
      ).rejects.toThrow(/API key is required/);
    });
  });

  describe('3. Groq Adapter Tests', () => {
    const adapter = new GroqAdapter();

    it('fails gracefully when testing without API key', async () => {
      // Temporarily remove groq key
      storage.setProviderSecret('groq', { apiKey: '' });
      const res = await adapter.testConnection();
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/not configured|invalid groq api key/i);
    });
  });

  describe('4. Model Registry Filtering & Discovery', () => {
    it('returns verified free models when querying getVerifiedFreeModels', () => {
      const freeModels = modelRegistry.getVerifiedFreeModels();
      expect(freeModels.length).toBeGreaterThan(0);
      for (const m of freeModels) {
        expect(['verified_free', 'free_with_limits']).toContain(m.freeEligibility);
        expect(m.freeEligibility).not.toBe('paid');
      }
    });

    it('includes MiniMax M2.7 in all models but marks it as paid', () => {
      const all = modelRegistry.getAllModels();
      const m27 = all.find(m => m.id === 'minimax/minimax-m2.7');
      expect(m27).toBeDefined();
      expect(m27?.freeEligibility).toBe('paid');
    });
  });
});
