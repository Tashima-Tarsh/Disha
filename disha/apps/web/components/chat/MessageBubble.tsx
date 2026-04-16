import { User, Bot, AlertCircle, Bookmark, ShieldCheck, Gavel } from "lucide-react";
import { cn, extractTextContent } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { MarkdownContent } from "./MarkdownContent";
import { motion, AnimatePresence } from "framer-motion";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const text = extractTextContent(message.content);

  // Detect intelligence domain
  const isLegal = !!message.citations || !!message.disclaimer;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex gap-4 mb-8 w-full",
        isUser && "flex-row-reverse"
      )}
      aria-label={isUser ? "Intelligence Request" : isError ? "Core Error" : "Elite Output"}
    >
      {/* Refined Luxury Avatar */}
      <div
        aria-hidden="true"
        className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 relative overflow-hidden transition-all duration-500",
          isUser
            ? "bg-white text-midnight shadow-glass-soft"
            : isError
            ? "bg-error-bg text-error border border-error/20 shadow-none"
            : "glass-elite text-white border border-white/5 shadow-glass-soft"
        )}
      >
        <div className="relative z-10">
          {isUser ? (
            <User size={18} strokeWidth={2.5} />
          ) : isError ? (
            <AlertCircle size={18} strokeWidth={2.5} />
          ) : (
            <div className="relative flex items-center justify-center">
               {isLegal ? <Gavel size={18} strokeWidth={2} /> : <Bot size={18} strokeWidth={2} />}
               {message.status === "streaming" && (
                 <motion.div 
                   animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute -inset-1 rounded-full bg-aurora/20 blur-sm"
                 />
               )}
            </div>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div
        className={cn(
          "flex-1 min-w-0 max-w-3xl",
          isUser && "flex justify-end"
        )}
      >
        <div
          className={cn(
            "px-6 py-5 relative overflow-hidden transition-all duration-500 rounded-[2rem]",
            isUser
              ? "bg-white/10 text-pearl/90 border border-white/5 shadow-glass-soft backdrop-blur-xl"
              : isError
              ? "bg-error-bg/30 border border-error/10 text-error/80"
              : "glass-elite text-pearl border border-white/5 shadow-glass-soft"
          )}
        >
          {/* Elite Domain-Specific Accent */}
          {!isUser && !isError && (
             <div className={cn(
               "absolute top-0 left-0 w-1 h-full",
               isLegal ? "bg-royal/60" : "bg-aurora/40"
             )} />
          )}

          <div className="relative z-10 font-sans leading-relaxed text-[15px]">
            {isUser ? (
              <p className="whitespace-pre-wrap break-words font-medium tracking-tight">{text}</p>
            ) : (
              <MarkdownContent content={text} />
            )}
            
            {message.status === "streaming" && (
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block w-4 h-1 bg-aurora rounded-full ml-2 align-middle shadow-[0_0_8px_var(--brand-aurora)]"
              />
            )}

            {/* Citations Layer */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                {message.citations.map((cite, i) => (
                  <span 
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-royal/10 border border-royal/20 text-[11px] font-display uppercase tracking-widest text-royal"
                  >
                    <Bookmark size={10} />
                    {cite}
                  </span>
                ))}
              </div>
            )}

            {/* Disclaimer Layer */}
            {message.disclaimer && (
              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3">
                 <ShieldCheck className="text-royal/60 flex-shrink-0" size={16} />
                 <p className="text-[11px] text-pearl/40 italic leading-relaxed">
                   {message.disclaimer}
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}


