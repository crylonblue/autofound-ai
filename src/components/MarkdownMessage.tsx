"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

const components: Components = {
  // Code blocks
  pre({ children }) {
    return (
      <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto my-2 text-xs">
        {children}
      </pre>
    );
  },
  code({ className, children, ...props }) {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={`${className ?? ""} text-xs font-mono`} {...props}>
        {children}
      </code>
    );
  },
  // Tables
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full text-xs border-collapse">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-white/10 px-2 py-1 text-left font-semibold bg-white/5">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border border-white/10 px-2 py-1">{children}</td>;
  },
  // Links
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  // Lists
  ul({ children }) {
    return <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>;
  },
  // Blockquotes
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-white/20 pl-3 my-2 text-zinc-400 italic">
        {children}
      </blockquote>
    );
  },
  // Paragraphs — no extra margin for tighter chat feel
  p({ children }) {
    return <p className="my-1 leading-relaxed">{children}</p>;
  },
  // Headings
  h1({ children }) {
    return <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>;
  },
  // Horizontal rule
  hr() {
    return <hr className="border-white/10 my-2" />;
  },
};

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
