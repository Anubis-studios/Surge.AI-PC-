/**
 * Open Agent OS - Storage & Secure Credential Store
 */
import fs from 'fs';
import path from 'path';
import { Conversation, UserPreferences, ProviderId, ProviderConfig } from './types.js';

interface ProviderSecret {
  apiKey?: string;
  accountId?: string;
  baseUrl?: string;
  configuredAt: string;
}

interface StoredData {
  preferences: UserPreferences;
  conversations: Conversation[];
  providerSecrets: Record<string, ProviderSecret>;
  providerHealth: Record<string, { lastCheck: string; status: string; message: string }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'open_agent_os_data.json');

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultModel: 'minimax/minimax-m2.7',
  preferredProvider: 'openrouter',
  freeOnly: true,
  allowFallback: true,
  theme: 'dark',
  dataRetention: 'persistent'
};

class StorageService {
  private memoryData: StoredData;

  constructor() {
    this.memoryData = {
      preferences: { ...DEFAULT_PREFERENCES },
      conversations: [],
      providerSecrets: {},
      providerHealth: {}
    };
    this.loadFromDisk();
  }

  private ensureDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // ignore
    }
  }

  private loadFromDisk() {
    try {
      this.ensureDir();
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.preferences) {
          this.memoryData.preferences = { ...DEFAULT_PREFERENCES, ...parsed.preferences };
        }
        if (Array.isArray(parsed.conversations)) {
          this.memoryData.conversations = parsed.conversations;
        }
        if (parsed.providerSecrets) {
          this.memoryData.providerSecrets = parsed.providerSecrets;
        }
        if (parsed.providerHealth) {
          this.memoryData.providerHealth = parsed.providerHealth;
        }
      }
    } catch (err) {
      console.warn('Storage: Using memory store, failed to read file:', (err as Error).message);
    }
  }

  private saveToDisk() {
    try {
      this.ensureDir();
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.memoryData, null, 2), { encoding: 'utf-8', mode: 0o600 });
    } catch (err) {
      console.warn('Storage: Failed to persist to disk:', (err as Error).message);
    }
  }

  // Preferences
  getPreferences(): UserPreferences {
    return { ...this.memoryData.preferences };
  }

  updatePreferences(patch: Partial<UserPreferences>): UserPreferences {
    this.memoryData.preferences = {
      ...this.memoryData.preferences,
      ...patch
    };
    this.saveToDisk();
    return this.getPreferences();
  }

  // Conversations
  listConversations(): Omit<Conversation, 'messages'>[] {
    return this.memoryData.conversations.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      selectedModel: c.selectedModel,
      selectedProvider: c.selectedProvider
    })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getConversation(id: string): Conversation | null {
    const found = this.memoryData.conversations.find(c => c.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  createConversation(title?: string, model?: string, provider?: ProviderId): Conversation {
    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: 'conv_' + Math.random().toString(36).substring(2, 11),
      title: title || 'New Conversation',
      createdAt: now,
      updatedAt: now,
      messages: [],
      selectedModel: model || this.memoryData.preferences.defaultModel,
      selectedProvider: provider || this.memoryData.preferences.preferredProvider
    };
    this.memoryData.conversations.unshift(newConv);
    this.saveToDisk();
    return newConv;
  }

  saveConversation(conv: Conversation): void {
    const index = this.memoryData.conversations.findIndex(c => c.id === conv.id);
    conv.updatedAt = new Date().toISOString();
    if (index >= 0) {
      this.memoryData.conversations[index] = conv;
    } else {
      this.memoryData.conversations.unshift(conv);
    }
    this.saveToDisk();
  }

  deleteConversation(id: string): boolean {
    const initialLen = this.memoryData.conversations.length;
    this.memoryData.conversations = this.memoryData.conversations.filter(c => c.id !== id);
    const deleted = this.memoryData.conversations.length < initialLen;
    if (deleted) this.saveToDisk();
    return deleted;
  }

  // Provider Secrets - Stored strictly on server side
  setProviderSecret(providerId: string, secret: { apiKey?: string; accountId?: string; baseUrl?: string }): void {
    const existing = this.memoryData.providerSecrets[providerId] || {};
    this.memoryData.providerSecrets[providerId] = {
      ...existing,
      ...(secret.apiKey !== undefined ? { apiKey: secret.apiKey.trim() } : {}),
      ...(secret.accountId !== undefined ? { accountId: secret.accountId.trim() } : {}),
      ...(secret.baseUrl !== undefined ? { baseUrl: secret.baseUrl.trim() } : {}),
      configuredAt: new Date().toISOString()
    };
    this.saveToDisk();
  }

  clearProviderSecret(providerId: string): void {
    delete this.memoryData.providerSecrets[providerId];
    this.saveToDisk();
  }

  getProviderSecret(providerId: string): ProviderSecret | null {
    // Check environment variable first
    const envKey = this.getEnvKeyForProvider(providerId);
    const stored = this.memoryData.providerSecrets[providerId];
    
    if (envKey) {
      return {
        apiKey: envKey,
        accountId: stored?.accountId || (providerId === 'cloudflare' ? process.env.CLOUDFLARE_ACCOUNT_ID : undefined),
        baseUrl: stored?.baseUrl || (providerId === 'ollama' ? (process.env.OLLAMA_BASE_URL || 'http://localhost:11434') : undefined),
        configuredAt: stored?.configuredAt || new Date().toISOString()
      };
    }

    if (stored) {
      if (stored.apiKey === '') {
        return null;
      }
      return stored;
    }

    if (providerId === 'ollama') {
      return {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        configuredAt: new Date().toISOString()
      };
    }

    return null;
  }

  hasProviderSecret(providerId: string): boolean {
    const sec = this.getProviderSecret(providerId);
    if (providerId === 'ollama') return true; // Local inference doesn't require key
    return Boolean(sec?.apiKey && sec.apiKey.length > 0);
  }

  hasEnvKey(providerId: string): boolean {
    return Boolean(this.getEnvKeyForProvider(providerId));
  }

  private getEnvKeyForProvider(providerId: string): string | undefined {
    switch (providerId) {
      case 'gemini':
        return process.env.GEMINI_API_KEY || process.env.API_KEY;
      case 'openrouter':
        return process.env.OPENROUTER_API_KEY;
      case 'groq':
        return process.env.GROQ_API_KEY;
      case 'cerebras':
        return process.env.CEREBRAS_API_KEY;
      case 'cloudflare':
        return process.env.CLOUDFLARE_API_TOKEN;
      case 'github':
        return process.env.GITHUB_TOKEN;
      case 'huggingface':
        return process.env.HUGGINGFACE_API_KEY;
      default:
        return undefined;
    }
  }

  // Health tracking
  updateProviderHealth(providerId: string, status: string, message: string) {
    this.memoryData.providerHealth[providerId] = {
      lastCheck: new Date().toISOString(),
      status,
      message
    };
    this.saveToDisk();
  }

  getProviderHealth(providerId: string) {
    return this.memoryData.providerHealth[providerId] || null;
  }
}

export const storage = new StorageService();
