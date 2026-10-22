"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content?: string | null;
  className?: string;
  fallbackText?: string;
}

export function MarkdownContent({
  content,
  className = "",
  fallbackText = "No additional details provided.",
}: MarkdownContentProps) {
  if (!content || !content.trim()) {
    return <p className="text-sm text-slate-400 italic">{fallbackText}</p>;
  }

  return (
    <div className={`prose-rail max-w-none text-slate-300 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-2xl sm:text-3xl font-black text-white mt-7 mb-3.5 pb-2.5 border-b border-white/10 flex items-center gap-2.5 tracking-tight text-rail-amber"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-xl sm:text-2xl font-extrabold text-white mt-6 mb-3 pb-2 border-b border-white/5 flex items-center gap-2 tracking-tight"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-base sm:text-lg font-bold text-amber-400 mt-5 mb-2 flex items-center gap-2 tracking-wide"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className="text-sm sm:text-base font-bold text-slate-200 mt-4 mb-1.5"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-3.5" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="space-y-2 my-3 pl-5 list-disc marker:text-rail-amber text-slate-300 text-sm sm:text-base"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="space-y-2 my-3 pl-5 list-decimal marker:text-rail-amber text-slate-300 text-sm sm:text-base"
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed text-slate-200 pl-1" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-white tracking-wide" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="text-slate-200 italic" {...props} />
          ),
          hr: () => <hr className="my-6 border-white/10" />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-rail-amber bg-rail-amber/10 pl-4 py-2.5 my-3.5 text-slate-200 rounded-r text-sm sm:text-base not-italic shadow-sm"
              {...props}
            />
          ),
          code: ({ node, inline, className: codeClass, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-slate-900 border border-slate-700/80 text-cyan-300 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono font-medium shadow-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-black/70 border border-white/10 rounded-xl p-4 overflow-x-auto my-4 text-xs sm:text-sm font-mono text-cyan-200 shadow-inner">
                <code className="text-cyan-200 block" {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-white/10 shadow-md">
              <table className="w-full text-left text-sm text-slate-300 border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-900/90 border-b border-white/10 text-white font-bold" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-xs text-slate-200" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2.5 border-b border-white/5 text-slate-300" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-rail-amber hover:text-rail-yellow underline font-medium transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

