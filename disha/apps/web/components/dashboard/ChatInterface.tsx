"use client";

import React, { useState } from "react";
import { 
  Send, 
  Paperclip, 
  Search, 
  Copy, 
  Terminal, 
  Cpu, 
  Sparkles,
  Command,
  PlusCircle,
  Hash
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "code" | "alert";
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "1", 
      role: "assistant", 
      content: "System stabilized. AI Sentinel active. How can I assist with your repository defense today?",
      type: "text"
    },
    {
      id: "2",
      role: "assistant",
      content: "```typescript\nfunction authorize(token: string) {\n  return token === process.env.AUTH_SECRET;\n}```",
      type: "code"
    }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages([...messages, newMessage]);
    setInput("");
    
    // Fake response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Processing request through honey-encryption layer... Command executed successfully.",
        type: "text"
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full relative z-10">
      {/* Top Search Bar */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/10 backdrop-blur-md">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            placeholder="Search repository, security logs, or commands..."
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-xs text-white/60 focus:outline-none focus:border-white/20 transition-all font-mono"
          />
        </div>
        <div className="flex items-center gap-2">
           <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-white/40 flex items-center gap-2">
              <Command size={12} />
              K
           </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col gap-2 max-w-[85%]",
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className="flex items-center gap-2 px-1">
                 {msg.role === "assistant" && <div className="w-5 h-5 rounded bg-ms-blue/20 flex items-center justify-center"><Sparkles size={12} className="text-ms-blue" /></div>}
                 <span className="text-[10px] font-mono uppercase tracking-widest text-white/20">{msg.role}</span>
                 {msg.role === "user" && <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center"><UserIcon size={12} className="text-white/60" /></div>}
              </div>

              {msg.type === "code" ? (
                <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs overflow-hidden group relative">
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 text-white/40">
                         <Terminal size={14} />
                         <span>security_auth.ts</span>
                      </div>
                      <button className="text-white/20 hover:text-white transition-colors">
                         <Copy size={14} />
                      </button>
                   </div>
                   <pre className="text-cyan-glow/80 whitespace-pre-wrap">{msg.content.replace(/```(typescript|javascript|json)?/, "").replace(/```/, "")}</pre>
                </div>
              ) : (
                <GlassCard 
                  animate={false} 
                  hover={false} 
                  className={cn(
                    "p-4 !rounded-2xl border-white/5",
                    msg.role === "user" ? "bg-white/5 border-white/10" : "bg-card/40"
                  )}
                >
                  <p className="text-sm text-foreground/80 leading-relaxed">{msg.content}</p>
                </GlassCard>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-ms-blue/20 to-msey-purple/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <GlassCard animate={false} hover={false} className="!p-1 border-white/10 group-focus-within:border-white/20 transition-all">
            <div className="flex items-end gap-2 p-2">
              <button className="p-2.5 rounded-xl hover:bg-white/5 text-white/20 transition-colors">
                <PlusCircle size={20} />
              </button>
              <textarea 
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Disha about repository security..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-white/20 py-2.5 resize-none max-h-40 overflow-y-auto no-scrollbar outline-none font-sans"
              />
              <div className="flex items-center gap-2 mb-1">
                 <button className="p-2.5 rounded-xl hover:bg-white/5 text-white/20 transition-colors">
                   <Paperclip size={18} />
                 </button>
                 <Button 
                   onClick={handleSend}
                   className="h-10 w-10 p-0 rounded-xl bg-ms-blue hover:bg-ms-blue/90 text-white flex items-center justify-center shrink-0"
                 >
                   <Send size={18} />
                 </Button>
              </div>
            </div>
          </GlassCard>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4">
           {["Repo Health", "Analyze Threats", "Sovereign Audit"].map(suggestion => (
             <button key={suggestion} className="px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-mono text-white/30 hover:text-white/60 hover:bg-white/5 transition-all uppercase tracking-widest">
                {suggestion}
             </button>
           ))}
        </div>
      </div>
    </div>
  );
}

function UserIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      className={className} 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
