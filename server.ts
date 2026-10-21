/**
 * Open Agent OS - Full-Stack Express Server with Vite Dev Middleware
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { storage } from './server/storage.js';
import { modelRegistry } from './server/registry/models.js';
import { PROVIDER_METADATA } from './server/registry/providers.js';
import { adapterManager } from './server/adapters/index.js';
import { routingEngine } from './server/router.js';
import { ProviderId, ProviderConfig, ChatMessage } from './server/types.js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // API: Providers
  // ==========================================
  app.get('/api/providers', (req: Request, res: Response) => {
    try {
      const providersList: ProviderConfig[] = (Object.keys(PROVIDER_METADATA) as ProviderId[]).map(id => {
        const meta = PROVIDER_METADATA[id];
        const isConfigured = storage.hasProviderSecret(id);
        const hasEnv = storage.hasEnvKey(id);
        const health = storage.getProviderHealth(id);
        const secret = storage.getProviderSecret(id);

        const models = modelRegistry.getAllModels().filter(m => m.provider === id);

        let status = meta.requiresKey && !isConfigured ? 'setup_required' : 'configured';
        if (health?.status) {
          status = health.status;
        }

        return {
          ...meta,
          isConfigured,
          hasEnvKey: hasEnv,
          status: status as any,
          statusMessage: health?.message || meta.statusMessage,
          modelsCount: models.length,
          lastHealthCheck: health?.lastCheck,
          customBaseUrl: secret?.baseUrl
        };
      });

      res.json({ providers: providersList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/providers/:id/config', (req: Request, res: Response) => {
    try {
      const providerId = req.params.id as ProviderId;
      if (!PROVIDER_METADATA[providerId]) {
        return res.status(404).json({ error: `Provider "${providerId}" not found.` });
      }

      const { apiKey, accountId, baseUrl } = req.body;
      storage.setProviderSecret(providerId, { apiKey, accountId, baseUrl });

      res.json({
        success: true,
        message: `Credentials updated for ${PROVIDER_METADATA[providerId].name}.`,
        isConfigured: storage.hasProviderSecret(providerId)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/providers/:id/test', async (req: Request, res: Response) => {
    try {
      const providerId = req.params.id as ProviderId;
      const adapter = adapterManager.getAdapter(providerId);

      if (!adapter) {
        return res.status(404).json({ error: `No adapter found for "${providerId}".` });
      }

      const testResult = await adapter.testConnection();
      storage.updateProviderHealth(providerId, testResult.success ? 'connected' : 'error', testResult.message);

      res.json({
        providerId,
        success: testResult.success,
        message: testResult.message,
        latencyMs: testResult.latencyMs
      });
    } catch (err: any) {
      storage.updateProviderHealth(req.params.id, 'error', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/providers/:id/refresh', async (req: Request, res: Response) => {
    try {
      const providerId = req.params.id as ProviderId;
      const adapter = adapterManager.getAdapter(providerId);

      if (!adapter) {
        return res.status(404).json({ error: `No adapter found for "${providerId}".` });
      }

      const discovered = await adapter.discoverModels();
      if (discovered.length > 0) {
        modelRegistry.registerDiscoveredModels(discovered);
      }

      res.json({
        providerId,
        success: true,
        count: discovered.length,
        models: discovered
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API: Models
  // ==========================================
  app.get('/api/models', (req: Request, res: Response) => {
    try {
      const models = modelRegistry.getAllModels();
      res.json({ models });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API: Preferences & Settings
  // ==========================================
  app.get('/api/settings', (req: Request, res: Response) => {
    try {
      const preferences = storage.getPreferences();
      res.json({ preferences });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings', (req: Request, res: Response) => {
    try {
      const patch = req.body;
      const updated = storage.updatePreferences(patch);
      res.json({ preferences: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API: Conversations
  // ==========================================
  app.get('/api/chats', (req: Request, res: Response) => {
    try {
      const chats = storage.listConversations();
      res.json({ chats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chats', (req: Request, res: Response) => {
    try {
      const { title, modelId, providerId } = req.body;
      const newConv = storage.createConversation(title, modelId, providerId);
      res.json({ chat: newConv });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/chats/:id', (req: Request, res: Response) => {
    try {
      const chat = storage.getConversation(req.params.id);
      if (!chat) return res.status(404).json({ error: 'Conversation not found.' });
      res.json({ chat });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/chats/:id', (req: Request, res: Response) => {
    try {
      const deleted = storage.deleteConversation(req.params.id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API: Streaming Chat Completion (SSE)
  // ==========================================
  app.post('/api/chat/stream', async (req: Request, res: Response) => {
    const { conversationId, message, modelId, providerId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const conv = conversationId ? storage.getConversation(conversationId) : storage.createConversation(undefined, modelId, providerId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    // Add user message to conversation
    const userMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 11),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };
    conv.messages.push(userMsg);
    storage.saveConversation(conv);

    // Prepare SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const selectedModel = modelId || conv.selectedModel || storage.getPreferences().defaultModel;
    const selectedProvider = providerId || conv.selectedProvider || storage.getPreferences().preferredProvider;

    const messagesPayload = conv.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    let fullAssistantContent = '';

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const metadata = await routingEngine.executeStream(
        selectedModel,
        selectedProvider,
        {
          messages: messagesPayload,
          signal: abortController.signal
        },
        (chunk) => {
          if (chunk.text) {
            fullAssistantContent += chunk.text;
            res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk.text })}\n\n`);
            // @ts-ignore
            if (typeof res.flush === 'function') res.flush();
          }
        }
      );

      // Save assistant message with metadata
      const assistantMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 11),
        role: 'assistant',
        content: fullAssistantContent,
        createdAt: new Date().toISOString(),
        metadata
      };
      conv.messages.push(assistantMsg);

      // Auto update title if first message
      if (conv.messages.length === 2 && conv.title === 'New Conversation') {
        conv.title = message.slice(0, 32) + (message.length > 32 ? '...' : '');
      }

      storage.saveConversation(conv);

      res.write(`data: ${JSON.stringify({ type: 'metadata', metadata, conversationId: conv.id })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (err: any) {
      const errorMsg = err.message || 'Stream processing failed';
      res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`);
      res.end();
    }
  });

  // ==========================================
  // API: Server-side Ink Actions for Desktop Apps
  // ==========================================
  app.post('/api/ink/action', async (req: Request, res: Response) => {
    try {
      const { base64Image, contextDescription, tools, systemInstruction } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || storage.getProviderSecret('gemini')?.apiKey;

      if (!apiKey) {
        return res.status(401).json({ error: 'Server-side Gemini API key not found in environment or secrets.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const contents: any[] = [];
      if (base64Image) {
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
      }
      contents.push({ text: `Analyze the white ink drawings. The user is currently focused on: ${contextDescription || 'Desktop'}.` });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          tools: tools || undefined,
          temperature: 0.1,
        }
      });

      res.json({
        success: true,
        text: response.text,
        functionCalls: response.functionCalls || []
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Vite Integration (Dev Middleware / Static Prod)
  // ==========================================
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Open Agent OS] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[Open Agent OS] Default Model: minimax/minimax-m2.7 (Free-Only Mode: ON)`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Open Agent OS server:', err);
  process.exit(1);
});
