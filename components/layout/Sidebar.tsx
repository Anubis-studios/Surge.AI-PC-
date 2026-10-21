import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Server,
  Settings,
  Monitor,
  Trash2,
  ShieldCheck,
  Search,
  Cpu,
  Layers
} from 'lucide-react';
import { Conversation, UserPreferences } from '../../server/types';

interface SidebarProps {
  activeTab: 'chat' | 'providers' | 'models' | 'settings' | 'desktop';
  onSelectTab: (tab: 'chat' | 'providers' | 'models' | 'settings' | 'desktop') => void;
  conversations: Omit<Conversation, 'messages'>[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string, e: React.MouseEvent) => void;
  preferences: UserPreferences;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  conversations,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  preferences
}) => {
  const [chatSearch, setChatSearch] = useState('');

  const filteredChats = conversations.filter(c =>
    c.title.toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <aside className="w-64 sm:w-72 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md">
            <Layers size={18} />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-wide">OPEN AGENT OS</h1>
            <span className="text-[10px] text-zinc-400 font-medium">Unified AI Platform</span>
          </div>
        </div>

        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          title="New Chat"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Primary Navigation */}
      <div className="p-3 border-b border-zinc-800/80 space-y-1 text-xs">
        <button
          onClick={() => onSelectTab('chat')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/80'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <MessageSquare size={16} />
          <span>Unified Chat</span>
        </button>

        <button
          onClick={() => onSelectTab('providers')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'providers'
              ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/80'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Server size={16} />
          <span>Models & Providers</span>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/80'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Settings size={16} />
          <span>Settings & Routing</span>
        </button>

        <button
          onClick={() => onSelectTab('desktop')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'desktop'
              ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/80'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Monitor size={16} />
            <span>Visual Computer</span>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] rounded bg-zinc-800 text-indigo-300 font-semibold uppercase">OS</span>
        </button>
      </div>

      {/* Chat History Section */}
      <div className="flex-1 flex flex-col min-h-0 p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Conversations
          </span>
          <span className="text-[11px] text-zinc-600">{conversations.length}</span>
        </div>

        {conversations.length > 4 && (
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={chatSearch}
              onChange={e => setChatSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredChats.length === 0 ? (
            <div className="text-center py-6 text-zinc-600 text-xs">
              No conversations yet
            </div>
          ) : (
            filteredChats.map(c => {
              const isSelected = c.id === currentChatId && activeTab === 'chat';
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectChat(c.id);
                    onSelectTab('chat');
                  }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-950/60 text-white font-medium border border-indigo-800/50'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate flex-1 pr-2">{c.title}</span>
                  <button
                    onClick={e => onDeleteChat(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                    title="Delete chat"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 text-xs space-y-2">
        <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Preferred Default</span>
            <span className="text-[11px] text-indigo-300 font-mono font-medium flex items-center gap-1">
              <Cpu size={12} /> MiniMax M2.7
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Routing Policy</span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <ShieldCheck size={12} /> {preferences.freeOnly ? 'Strict Free-Only' : 'Paid Allowed'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
