"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-invert max-w-none",
        "prose-p:leading-relaxed prose-p:my-2 prose-p:text-pearl/80",
        "prose-pre:glass-elite prose-pre:border prose-pre:border-white/5 prose-pre:rounded-2xl prose-pre:p-6",
        "prose-code:text-aurora prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:code:bg-transparent prose-pre:code:text-pearl/90 prose-pre:code:p-0 prose-pre:code:text-sm",
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-pearl/70",
        "prose-headings:text-white prose-headings:font-display prose-headings:tracking-wide prose-headings:font-medium",
        "prose-a:text-aurora prose-a:no-underline hover:prose-a:underline transition-all",
        "prose-blockquote:border-aurora prose-blockquote:bg-aurora/5 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:text-pearl/60",
        "prose-hr:border-white/5",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
