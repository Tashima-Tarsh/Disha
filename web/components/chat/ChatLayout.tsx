"use client";

import { useEffect, useMemo, useState } from "react";
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
import { BuddyPanel } from "@/components/buddy/BuddyPanel";
import { getBuddyProfile, getBuddySeed, getBuddySuggestions, type BuddyProfile } from "@/lib/buddy";

const DEMO_USER = {
  id: "local-user",
  name: "Local Operator",
  email: "local@example.com",
  color: "#22c55e",
  role: "owner" as const,
};

function extractMessageText(content: string | Array<{ type?: string; text?: string; content?: unknown }>) {
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((block) => {
      if (block?.type === "text") {
        return block.text ?? "";
      }
      if (block?.type === "tool_result" && typeof block.content === "string") {
        return block.content;
      }
      return "";
    })
    .join("");
}

export function ChatLayout() {
  const {
    conversations,
    createConversation,
    activeConversationId,
    buddyOpen,
    openBuddy,
    closeBuddy,
  } = useChatStore();
  const [buddyProfile, setBuddyProfile] = useState<BuddyProfile>(() => getBuddyProfile("agclaw-local-operator"));
  const [pendingBuddyPrompt, setPendingBuddyPrompt] = useState("");

  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    }
  }, [conversations.length, createConversation]);

  useEffect(() => {
    setBuddyProfile(getBuddyProfile(getBuddySeed()));
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const latestPrompt = useMemo(() => {
    const latestUserMessage = [...(activeConversation?.messages ?? [])]
      .reverse()
      .find((message) => message.role === "user");
    return latestUserMessage ? extractMessageText(latestUserMessage.content) : "";
  }, [activeConversation]);

  const buddySuggestions = useMemo(
    () => getBuddySuggestions(buddyProfile, latestPrompt),
    [buddyProfile, latestPrompt]
  );

  return (
    <CollaborationProvider sessionId="local-session" currentUser={DEMO_USER}>
      <AnnouncerProvider>
        <SkipToContent />
        <div className="flex h-screen bg-surface-950 text-surface-100">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header buddyProfile={buddyProfile} onOpenBuddy={openBuddy} />
            <main id="main-content" aria-label="Chat" className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                {activeConversationId ? (
                  <>
                    <ChatWindow conversationId={activeConversationId} />
                    <ChatInput
                      conversationId={activeConversationId}
                      buddyProfile={buddyProfile}
                      latestPrompt={latestPrompt}
                      buddySuggestions={buddySuggestions}
                      onOpenBuddy={openBuddy}
                      pendingBuddyPrompt={pendingBuddyPrompt}
                      onBuddyPromptApplied={() => setPendingBuddyPrompt("")}
                    />
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-surface-500">
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
        <BuddyPanel
          open={buddyOpen}
          profile={buddyProfile}
          latestPrompt={latestPrompt}
          suggestions={buddySuggestions}
          onClose={closeBuddy}
          onUseSuggestion={(prompt) => {
            setPendingBuddyPrompt(prompt);
            closeBuddy();
          }}
        />
      </AnnouncerProvider>
    </CollaborationProvider>
  );
}
