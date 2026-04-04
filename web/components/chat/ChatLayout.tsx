"use client";

import { useEffect } from "react";
import { useChatStore } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ChatWindow } from "./ChatWindow";
import { ChatInput } from "./ChatInput";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { AnnouncerProvider } from "@/components/a11y/Announcer";
import { DesktopFileViewer } from "@/components/file-viewer/DesktopFileViewer";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { CollaborationProvider } from "@/components/collaboration/CollaborationProvider";
import { ResearchWorkbench } from "@/components/research/ResearchWorkbench";

const DEMO_USER = {
  id: "local-user",
  name: "Local Operator",
  email: "local@example.com",
  color: "#22c55e",
  role: "owner" as const,
};

export function ChatLayout() {
  const { conversations, createConversation, activeConversationId } = useChatStore();

  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    }
  }, [conversations.length, createConversation]);

  return (
    <CollaborationProvider sessionId="local-session" currentUser={DEMO_USER}>
      <AnnouncerProvider>
        <SkipToContent />
        <div className="flex h-screen bg-surface-950 text-surface-100">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Header />
            <main
              id="main-content"
              aria-label="Chat"
              className="flex flex-1 min-h-0"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                {activeConversationId ? (
                  <>
                    <ChatWindow conversationId={activeConversationId} />
                    <ChatInput conversationId={activeConversationId} />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-surface-500">
                    Select or create a conversation
                  </div>
                )}
              </div>
              <DesktopFileViewer />
            </main>
          </div>
        </div>
        <SettingsDialog />
        <ResearchWorkbench />
      </AnnouncerProvider>
    </CollaborationProvider>
  );
}
