/**
 * Open Agent OS - Master Application Entry Point
 * Phase 1: MiniMax M2.7 Default · Real Free AI Providers · Unified Chat · Strict Free Routing
 */
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { ProvidersPage } from './components/providers/ProvidersPage';
import { ModelsPage } from './components/models/ModelsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { DesktopEnvironment } from './components/desktop/DesktopEnvironment';
import { ModelSelectorModal } from './components/chat/ModelSelectorModal';
import {
  Conversation,
  ModelDefinition,
  ProviderConfig,
  UserPreferences,
  ChatMessage
} from './server/types';
import { INITIAL_MODEL_CATALOG, CANONICAL_DEFAULT_MODEL_ID } from './server/registry/models';

export const App: React.FC = () => {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'chat' | 'providers' | 'models' | 'settings' | 'desktop'>('chat');

  // Server Data
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultModel: CANONICAL_DEFAULT_MODEL_ID,
    preferredProvider: 'openrouter',
    freeOnly: true,
    allowFallback: true,
    theme: 'dark',
    dataRetention: 'persistent'
  });
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [models, setModels] = useState<ModelDefinition[]>(INITIAL_MODEL_CATALOG);
  const [conversations, setConversations] = useState<Omit<Conversation, 'messages'>[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Active Model
  const [selectedModel, setSelectedModel] = useState<ModelDefinition>(() => {
    return INITIAL_MODEL_CATALOG.find(m => m.id === CANONICAL_DEFAULT_MODEL_ID) || INITIAL_MODEL_CATALOG[0];
  });
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initial Data Load
  useEffect(() => {
    loadSettings();
    loadProviders();
    loadModels();
    loadConversations();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setPreferences(data.preferences);
          // Sync selected model to preferred default if at initial state
          const defModel = models.find(m => m.id === data.preferences.defaultModel);
          if (defModel) setSelectedModel(defModel);
        }
      }
    } catch (e) {
      console.warn('Could not load preferences from server, using local defaults.');
    }
  };

  const loadProviders = async () => {
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.providers)) {
          setProviders(data.providers);
        }
      }
    } catch (e) {
      console.warn('Could not load providers list.');
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
          // Update selected model definition from fresh server data
          const current = data.models.find((m: ModelDefinition) => m.id === selectedModel.id);
          if (current) setSelectedModel(current);
        }
      }
    } catch (e) {
      console.warn('Could not load models list.');
    }
  };

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chats)) {
          setConversations(data.chats);
          if (data.chats.length > 0 && !currentConversation) {
            loadSingleConversation(data.chats[0].id);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load conversations.');
    }
  };

  const loadSingleConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.chat) {
          setCurrentConversation(data.chat);
          const m = models.find(mod => mod.id === data.chat.selectedModel);
          if (m) setSelectedModel(m);
        }
      }
    } catch (e) {
      console.warn('Failed to load conversation:', id);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Conversation',
          modelId: selectedModel.id,
          providerId: selectedModel.provider
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.chat) {
          setCurrentConversation(data.chat);
          setConversations(prev => [data.chat, ...prev]);
          setActiveTab('chat');
          setStreamError(null);
        }
      }
    } catch (e) {
      console.error('Error creating new conversation:', e);
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (currentConversation?.id === id) {
          setCurrentConversation(null);
        }
      }
    } catch (e) {
      console.error('Error deleting chat:', e);
    }
  };

  // Streaming Chat Submission
  const handleSendMessage = async (content: string) => {
    setStreamError(null);
    setIsStreaming(true);
    setStreamingText('');

    // Optimistically create conversation if none active
    let activeChat = currentConversation;
    if (!activeChat) {
      try {
        const createRes = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: content.slice(0, 32),
            modelId: selectedModel.id,
            providerId: selectedModel.provider
          })
        });
        const cData = await createRes.json();
        activeChat = cData.chat;
        setCurrentConversation(activeChat);
        setConversations(prev => [activeChat!, ...prev]);
      } catch (err: any) {
        setIsStreaming(false);
        setStreamError('Failed to initialize conversation session.');
        return;
      }
    }

    // Add user message to UI immediately
    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };
    setCurrentConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMsg]
    } : null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeChat?.id,
          message: content,
          modelId: selectedModel.id,
          providerId: selectedModel.provider
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream available.');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const rawPayload = trimmed.slice(6).trim();
            if (rawPayload === '[DONE]') {
              continue;
            }

            try {
              const eventData = JSON.parse(rawPayload);

              if (eventData.type === 'delta') {
                accumulatedText += eventData.text;
                setStreamingText(accumulatedText);
              } else if (eventData.type === 'metadata') {
                // Assistant message complete with metadata
                const assistantMsg: ChatMessage = {
                  id: 'ast_' + Date.now(),
                  role: 'assistant',
                  content: accumulatedText,
                  createdAt: new Date().toISOString(),
                  metadata: eventData.metadata
                };

                setCurrentConversation(prev => {
                  if (!prev) return null;
                  // Replace any streaming placeholder with complete message
                  return {
                    ...prev,
                    messages: [...prev.messages, assistantMsg]
                  };
                });

                setStreamingText('');
              } else if (eventData.type === 'error') {
                setStreamError(eventData.message);
              }
            } catch (pErr) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }

      await loadConversations();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStreamError(err.message || 'Stream connection failed.');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleRetry = () => {
    if (currentConversation && currentConversation.messages.length > 0) {
      const lastUserMsg = [...currentConversation.messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        handleSendMessage(lastUserMsg.content);
      }
    }
  };

  // Provider Actions
  const handleTestConnection = async (id: string) => {
    const res = await fetch(`/api/providers/${id}/test`, { method: 'POST' });
    return await res.json();
  };

  const handleRefreshModels = async (id: string) => {
    await fetch(`/api/providers/${id}/refresh`, { method: 'POST' });
    await loadModels();
  };

  const handleSaveCredentials = async (id: string, creds: any) => {
    await fetch(`/api/providers/${id}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    await loadProviders();
  };

  const handleSavePreferences = async (patch: Partial<UserPreferences>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (res.ok) {
      const data = await res.json();
      setPreferences(data.preferences);
      if (patch.defaultModel) {
        const found = models.find(m => m.id === patch.defaultModel);
        if (found) setSelectedModel(found);
      }
    }
  };

  const handleSetDefaultModel = async (modelId: string) => {
    await handleSavePreferences({ defaultModel: modelId });
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden">
      {/* Primary Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        conversations={conversations}
        currentChatId={currentConversation?.id || null}
        onSelectChat={loadSingleConversation}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        preferences={preferences}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeTab === 'chat' && (
          <ChatArea
            conversation={currentConversation}
            onSendMessage={handleSendMessage}
            onStop={handleStop}
            onRetry={handleRetry}
            isStreaming={isStreaming}
            streamingText={streamingText}
            streamError={streamError}
            selectedModel={selectedModel}
            onOpenModelSelector={() => setIsModelSelectorOpen(true)}
            freeOnly={preferences.freeOnly}
          />
        )}

        {activeTab === 'providers' && (
          <ProvidersPage
            providers={providers}
            onRefreshProviders={loadProviders}
            onTestConnection={handleTestConnection}
            onRefreshModels={handleRefreshModels}
            onSaveCredentials={handleSaveCredentials}
          />
        )}

        {activeTab === 'models' && (
          <ModelsPage
            models={models}
            defaultModelId={preferences.defaultModel}
            onSetDefaultModel={handleSetDefaultModel}
            onSelectForChat={(m) => {
              setSelectedModel(m);
              setActiveTab('chat');
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            preferences={preferences}
            models={models}
            onSavePreferences={handleSavePreferences}
          />
        )}

        {activeTab === 'desktop' && (
          <DesktopEnvironment />
        )}
      </main>

      {/* Global Model Selector Modal */}
      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        models={models}
        selectedModelId={selectedModel.id}
        onSelectModel={(m) => {
          setSelectedModel(m);
          if (currentConversation) {
            currentConversation.selectedModel = m.id;
            currentConversation.selectedProvider = m.provider;
          }
        }}
        onSetAsDefault={(m) => handleSetDefaultModel(m.id)}
        freeOnly={preferences.freeOnly}
      />
    </div>
  );
};