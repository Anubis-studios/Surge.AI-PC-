/**
 * Open Agent OS - Preserved Visual Computer Desktop Environment
 */
import React, { useState, useRef } from 'react';
import {
  MousePointer2,
  PenLine,
  Play,
  Mail,
  Presentation,
  Folder,
  Loader2,
  FileText,
  Image as ImageIcon,
  Gamepad2,
  Eraser,
  X,
  Sparkles
} from 'lucide-react';
import { DesktopItem, Stroke, Email } from '../../types';
import { HomeScreen } from '../apps/HomeScreen';
import { MailApp } from '../apps/MailApp';
import { SlidesApp } from '../apps/SlidesApp';
import { SnakeGame } from '../apps/SnakeGame';
import { FolderView } from '../apps/FolderView';
import { DraggableWindow } from '../DraggableWindow';
import { InkLayer } from '../InkLayer';
import { NotepadApp } from '../apps/NotepadApp';
import { executeServerInkAction, HOME_TOOLS, MAIL_TOOLS, SYSTEM_INSTRUCTION } from '../../lib/gemini';

const INITIAL_DESKTOP_ITEMS: DesktopItem[] = [
  { id: 'mail', name: 'Mail', type: 'app', icon: Mail, appId: 'mail', bgColor: 'bg-gradient-to-br from-blue-400 to-blue-700' },
  { id: 'slides', name: 'Slides', type: 'app', icon: Presentation, appId: 'slides', bgColor: 'bg-gradient-to-br from-orange-400 to-orange-700' },
  { id: 'snake', name: 'Game', type: 'app', icon: Gamepad2, appId: 'snake', bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-800' },
  { 
    id: 'how_to_use', 
    name: 'how_to_use.txt', 
    type: 'app', 
    icon: FileText, 
    appId: 'notepad', 
    bgColor: 'bg-gradient-to-br from-pink-500 to-pink-700',
    notepadInitialContent: `OPEN AGENT OS - VISUAL COMPUTER GUIDE

Navigate your workspace using natural hand-drawn sketches or standard window controls.

GLOBAL / DESKTOP
----------------
1. Delete Item: Draw an "X" or a cross over any app icon or folder to delete it.
2. Explode Folder: Draw outward pointing arrows coming out of a folder to "explode" it onto the desktop.
3. Get Info: Draw a question mark "?" over an item to inspect or summarize it.
4. Generate Wallpaper: Draw a sketch on the desktop background to change wallpaper.`
  },
  { 
    id: 'notes', 
    name: 'notes.txt', 
    type: 'app', 
    icon: FileText, 
    appId: 'notepad', 
    bgColor: 'bg-gradient-to-br from-zinc-400 to-zinc-600',
    notepadInitialContent: `TODO LIST:
- Verify MiniMax M2.7 default selection
- Test OpenRouter free router and Gemini fallback
- Run Vitest test suite
- Check SSRF validation on custom endpoints`
  },
  { id: 'docs', name: 'Documents', type: 'folder', icon: Folder, bgColor: 'bg-gradient-to-br from-sky-400 to-sky-700', contents: [
    { id: 'doc1', name: 'SystemReport.docx', type: 'app', icon: FileText, bgColor: 'bg-gradient-to-br from-blue-500 to-blue-700' },
    { id: 'img1', name: 'Architecture.png', type: 'app', icon: ImageIcon, bgColor: 'bg-gradient-to-br from-purple-500 to-purple-700' }
  ]},
  { id: 'projects', name: 'Projects', type: 'folder', icon: Folder, bgColor: 'bg-gradient-to-br from-indigo-400 to-indigo-700', contents: [
    { id: 'p1', name: 'OpenAgentRouter.ts', type: 'app', icon: FileText, bgColor: 'bg-gradient-to-br from-cyan-500 to-cyan-700' }
  ]}
];

const INITIAL_EMAILS: Email[] = [
  { id: 1, from: 'System Admin', subject: 'Open Agent OS Initialized', preview: 'MiniMax M2.7 set as default preference with strict free routing...', body: 'Welcome to Open Agent OS.\n\nAll 9 provider adapters are active. Free-Only Mode is enforced on the server to prevent unexpected inference charges.', time: '10:00 AM', unread: true },
  { id: 2, from: 'OpenRouter Team', subject: 'Free Tier Endpoints Active', preview: 'meta-llama/llama-3.3-70b-instruct:free is available...', body: 'Verified free models with zero prompt/completion charges are currently available.', time: 'Yesterday', unread: false }
];

interface OpenWindow {
  id: string;
  item: DesktopItem;
  zIndex: number;
  pos: { x: number; y: number };
  size?: { width: number; height: number };
}

export const DesktopEnvironment: React.FC = () => {
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(100);
  const [inkMode, setInkMode] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [desktopItems, setDesktopItems] = useState<(DesktopItem | null)[]>(INITIAL_DESKTOP_ITEMS);
  const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ title?: string; message: React.ReactNode } | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const showToast = (message: React.ReactNode, title?: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, title });
    timeoutRef.current = window.setTimeout(() => setToast(null), 5000);
  };

  const handleLaunch = (item: DesktopItem) => {
    if (inkMode) return;
    if (openWindows.find(w => w.id === item.id)) {
      focusWindow(item.id);
      return;
    }

    let initialSize = { width: 640, height: 480 };
    if (item.appId === 'mail') initialSize = { width: 800, height: 560 };
    if (item.appId === 'snake') initialSize = { width: 480, height: 520 };
    if (item.appId === 'notepad') initialSize = { width: 440, height: 500 };

    setOpenWindows(prev => [...prev, {
      id: item.id,
      item,
      zIndex: nextZIndex,
      pos: { x: 80 + (prev.length * 25), y: 60 + (prev.length * 25) },
      size: initialSize
    }]);
    setNextZIndex(prev => prev + 1);
    setFocusedId(item.id);
  };

  const closeWindow = (id: string) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id));
    if (focusedId === id) setFocusedId(null);
  };

  const focusWindow = (id: string | null) => {
    if (!id) {
      setFocusedId(null);
      return;
    }
    setFocusedId(id);
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
    setNextZIndex(prev => prev + 1);
  };

  const executeInkAction = async () => {
    if (strokes.length === 0) {
      showToast('Draw something with the pen first!');
      return;
    }

    setIsProcessing(true);
    try {
      let base64Image = '';
      try {
        if (typeof window.html2canvas === 'function') {
          const canvas = await window.html2canvas(document.body, {
            ignoreElements: (el: HTMLElement) => el.id === 'desktop-control-bar',
            logging: false,
            useCORS: true,
            scale: 1
          });
          base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        }
      } catch (cErr) {
        console.warn('html2canvas screenshot skipped:', cErr);
      }

      let activeTools = HOME_TOOLS;
      let contextDescription = 'Desktop (Home Screen)';

      if (focusedId) {
        const focusedWindow = openWindows.find(w => w.id === focusedId);
        if (focusedWindow?.item.appId === 'mail') {
          activeTools = MAIL_TOOLS;
          contextDescription = 'Mail App';
        }
      }

      const res = await executeServerInkAction({
        base64Image,
        contextDescription,
        tools: activeTools,
        systemInstruction: SYSTEM_INSTRUCTION
      });

      const calls = res.functionCalls || [];
      if (calls.length > 0) {
        for (const call of calls) {
          const args = call.args || {};
          if (call.name === 'delete_item' && args.itemName) {
            setDesktopItems(prev => prev.filter(i => !i?.name.toLowerCase().includes(args.itemName.toLowerCase())));
            showToast(`Deleted "${args.itemName}"`, 'Gesture Recognized');
          } else if (call.name === 'explain_item' && args.itemName) {
            showToast(`Inspecting: ${args.itemName}`, 'Gesture Info');
          } else if (call.name === 'delete_email') {
            setEmails(prev => prev.slice(1));
            showToast('Email removed', 'Gesture Recognized');
          } else {
            showToast(`Executed: ${call.name}`, 'Gesture Recognized');
          }
        }
      } else {
        showToast('No gesture recognized. Try drawing an "X" over an icon or "?" over a file.', 'Ink Assistant');
      }
      setStrokes([]);
      setInkMode(false);
    } catch (err: any) {
      showToast(`Ink processing error: ${err.message}`, 'Notice');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 relative h-full w-full bg-[#12131a] overflow-hidden select-none">
      {/* Background Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-zinc-950 to-zinc-950 pointer-events-none" />

      {/* Grid Canvas */}
      <div className="relative h-full w-full z-10" onClick={() => focusWindow(null)}>
        <HomeScreen desktopItems={desktopItems} onLaunch={handleLaunch} />

        {/* Windows */}
        {openWindows.map(w => (
          <DraggableWindow
            key={w.id}
            id={w.id}
            title={w.item.name}
            zIndex={w.zIndex}
            initialPos={w.pos}
            initialSize={w.size}
            onClose={() => closeWindow(w.id)}
            onFocus={() => focusWindow(w.id)}
            isFocused={focusedId === w.id}
          >
            {w.item.appId === 'mail' && <MailApp emails={emails} />}
            {w.item.appId === 'slides' && <SlidesApp />}
            {w.item.appId === 'snake' && <SnakeGame />}
            {w.item.appId === 'notepad' && <NotepadApp initialContent={w.item.notepadInitialContent} />}
            {w.item.type === 'folder' && <FolderView contents={w.item.contents || []} onLaunch={handleLaunch} />}
          </DraggableWindow>
        ))}

        {/* Drawing Ink Layer */}
        <InkLayer
          active={inkMode}
          strokes={strokes}
          setStrokes={setStrokes}
          isProcessing={isProcessing}
        />
      </div>

      {/* Floating Gesture & Pen Control Bar */}
      <div
        id="desktop-control-bar"
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[3000] flex items-center gap-2 px-4 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-md text-white text-xs"
      >
        <button
          onClick={() => {
            setInkMode(false);
            setStrokes([]);
          }}
          className={`p-2 rounded-xl transition-all ${
            !inkMode ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
          }`}
          title="Pointer Mode"
        >
          <MousePointer2 size={16} />
        </button>

        <button
          onClick={() => setInkMode(true)}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
            inkMode ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
          }`}
          title="Pen / Ink Gesture Mode"
        >
          <PenLine size={16} />
          <span className="font-semibold">Ink Gestures</span>
        </button>

        {inkMode && (
          <>
            <div className="w-px h-5 bg-zinc-700" />
            <button
              onClick={() => setStrokes([])}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Clear Drawing"
            >
              <Eraser size={16} />
            </button>

            <button
              onClick={executeInkAction}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play size={14} className="fill-current" />
                  <span>Run Gesture</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-6 right-6 z-[4000] max-w-sm p-4 rounded-xl bg-zinc-900/95 border border-zinc-700 text-zinc-100 shadow-2xl backdrop-blur-md">
          {toast.title && <strong className="block text-xs font-semibold text-indigo-400 mb-1">{toast.title}</strong>}
          <div className="text-xs leading-relaxed">{toast.message}</div>
        </div>
      )}
    </div>
  );
};
