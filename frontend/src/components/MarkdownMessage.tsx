"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Check, Copy, ExternalLink } from "lucide-react";

interface MarkdownMessageProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

// Code Block with Copy Button
const CodeBlock: React.FC<{
  className?: string;
  children?: React.ReactNode;
}> = ({ className, children }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeString = String(children || "").replace(/\n$/, "");

  const handleCopy = () => {
    if (!codeString) return;
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-gray-200 bg-gray-900 text-gray-100 shadow-2xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-gray-800/90 border-b border-gray-700/60 text-[11px] font-mono text-gray-400">
        <span className="uppercase tracking-wider">{lang || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors focus:outline-none"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed selection:bg-purple-900 selection:text-white">
        <code>{children}</code>
      </pre>
    </div>
  );
};

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
  content,
  className = "",
  isStreaming = false,
}) => {
  // If streaming and content ends with incomplete markdown tokens, wrap safely
  const sanitizedContent = content || "";

  return (
    <div className={`markdown-content break-words text-xs sm:text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Code & Syntax Styling
          code({ node, inline, className, children, ...props }: any) {
            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md font-mono text-[12px] bg-purple-50 text-purple-700 border border-purple-200/60 font-semibold"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },

          // Tables
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-gray-200/90 shadow-2xs bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-gray-50/90 font-semibold text-gray-700">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-gray-50/50 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-3.5 py-2 text-gray-800 whitespace-normal">{children}</td>;
          },

          // Headings
          h1({ children }) {
            return (
              <h1 className="text-base sm:text-lg font-black text-gray-900 mt-4 mb-2 first:mt-0 tracking-tight">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mt-3.5 mb-1.5 first:mt-0 tracking-tight">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 mt-3 mb-1 first:mt-0">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-xs font-bold text-gray-800 mt-2.5 mb-1 first:mt-0">
                {children}
              </h4>
            );
          },

          // Paragraphs
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 text-gray-800 leading-relaxed">{children}</p>;
          },

          // Lists
          ul({ children }) {
            return <ul className="my-2 ml-4 list-disc space-y-1 text-gray-700">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 ml-4 list-decimal space-y-1 text-gray-700">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-1 leading-relaxed">{children}</li>;
          },

          // Blockquote
          blockquote({ children }) {
            return (
              <blockquote className="my-3 pl-3.5 border-l-3 border-purple-500 text-gray-600 italic bg-purple-50/40 py-1.5 rounded-r-lg">
                {children}
              </blockquote>
            );
          },

          // Horizontal rule
          hr() {
            return <hr className="my-4 border-gray-200" />;
          },

          // Links
          a({ href, children }) {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="text-blue-600 hover:text-blue-700 underline font-medium inline-flex items-center gap-0.5 transition-colors"
              >
                <span>{children}</span>
                {isExternal && <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-70" />}
              </a>
            );
          },
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-600 animate-pulse align-middle" />
      )}
    </div>
  );
};
