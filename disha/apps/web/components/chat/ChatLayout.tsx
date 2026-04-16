"use client";

import { useChatStore } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ChatWindow } from "./ChatWindow";
import { ChatInput } from "./ChatInput";
import { EliteHero } from "@/components/layout/EliteHero";
import { motion, AnimatePresence } from "framer-motion";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { AnnouncerProvider } from "@/components/a11y/Announcer";

export function ChatLayout() {
  const { 
    activeConversationId, 
    createConversation, 
    setActiveConversation 
  } = useChatStore();

  const handleStart = () => {
    const id = createConversation();
    setActiveConversation(id);
  };

  return (
    <AnnouncerProvider>
      <SkipToContent />
      <div className="flex h-screen bg-transparent relative z-10 w-full overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 bg-transparent">
          <Header />
          
          <main className="flex-1 flex flex-col min-h-0 relative">
            <AnimatePresence mode="wait">
              {activeConversationId ? (
                <motion.div
                  key="active-chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <ChatWindow conversationId={activeConversationId} />
                  <ChatInput conversationId={activeConversationId} />
                </motion.div>
              ) : (
                <motion.div
                  key="elite-hero"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex"
                >
                  <EliteHero onStart={handleStart} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AnnouncerProvider>
  );
}
