import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split into code blocks and normal text
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-zinc-200 text-sm">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/^```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```$/);
          const lang = match ? match[1] || 'text' : 'text';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={index} className="my-3 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                <span className="font-semibold uppercase tracking-wider">{lang}</span>
                <button
                  onClick={() => handleCopy(code, index)}
                  className="flex items-center gap-1 hover:text-zinc-200 transition-colors py-0.5 px-1.5 rounded"
                  title="Copy code"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-zinc-100 whitespace-pre">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Render normal markdown paragraphs, bullet points, headers
        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;

              if (line.startsWith('### ')) {
                return <h3 key={lIdx} className="text-base font-bold text-zinc-100 mt-2 mb-1">{line.slice(4)}</h3>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={lIdx} className="text-lg font-bold text-white mt-3 mb-1.5">{line.slice(3)}</h2>;
              }
              if (line.startsWith('# ')) {
                return <h1 key={lIdx} className="text-xl font-extrabold text-white mt-3 mb-2">{line.slice(2)}</h1>;
              }

              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span>{formatInline(line.slice(2))}</span>
                  </div>
                );
              }

              const numMatch = line.match(/^(\d+)\.\s(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-indigo-400 font-semibold">{numMatch[1]}.</span>
                    <span>{formatInline(numMatch[2])}</span>
                  </div>
                );
              }

              if (line.startsWith('> ')) {
                return (
                  <blockquote key={lIdx} className="pl-3 border-l-2 border-indigo-500 text-zinc-400 italic my-1">
                    {formatInline(line.slice(2))}
                  </blockquote>
                );
              }

              return <p key={lIdx}>{formatInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};

function formatInline(text: string): React.ReactNode {
  // Simple inline parser for **bold**, `code`, and *italic*
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return tokens.map((token, i) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono text-xs border border-zinc-700">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={i} className="italic text-zinc-300">{token.slice(1, -1)}</em>;
    }
    return token;
  });
}
