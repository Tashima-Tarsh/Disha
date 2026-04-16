"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, FolderOpen, Settings, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ChatHistory } from "./ChatHistory";
import { FileExplorer } from "./FileExplorer";

const MIN_WIDTH = 240;
const MAX_WIDTH = 480;
const COLLAPSED_WIDTH = 80;

type SidebarTab = "chats" | "history" | "files" | "settings" | "dashboard";

const TABS: Array<{ id: SidebarTab; icon: React.ElementType; label: string }> = [
  { id: "dashboard", icon: LayoutGrid, label: "Overview" },
  { id: "chats", icon: MessageSquare, label: "Intelligence" },
  { id: "files", icon: FolderOpen, label: "Assets" },
  { id: "settings", icon: Settings, label: "Preferences" },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const {
    sidebarOpen,
    sidebarWidth,
    sidebarTab,
    toggleSidebar,
    setSidebarWidth,
    setSidebarTab,
    openSettings,
  } = useChatStore();

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
      setIsResizing(true);
    },
    [sidebarWidth]
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = e.clientX - resizeRef.current.startX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeRef.current.startWidth + delta));
      setSidebarWidth(next);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing, setSidebarWidth]);

  const handleTabClick = (id: SidebarTab) => {
    if (id === "settings") {
      openSettings();
      return;
    }
    if (!sidebarOpen) toggleSidebar();
    setSidebarTab(id);
  };

  return (
    <motion.aside
      className={cn(
        "hidden md:flex flex-col h-full glass-elite border-r border-white/5",
        "relative flex-shrink-0 z-20",
        isResizing && "select-none"
      )}
      animate={{ width: sidebarOpen ? sidebarWidth : COLLAPSED_WIDTH }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Intelligence sidebar"
    >
      {/* Brand Section */}
      <div className="p-8 flex items-center mb-4">
        <AnimatePresence mode="popLayout">
          {sidebarOpen ? (
            <motion.span
              key="expanded-title"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-lg font-display tracking-[0.4em] font-light uppercase text-gradient-pearl"
            >
              DISHA
            </motion.span>
          ) : (
            <motion.div 
              key="collapsed-core"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-4 h-4 rounded-full bg-white shadow-[0_0_10px_#ffffff] mx-auto"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 px-4 space-y-2">
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = sidebarTab === id;
          return (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={cn(
                "group relative w-full flex items-center transition-all duration-500 rounded-xl overflow-hidden",
                sidebarOpen ? "px-4 py-3" : "justify-center py-4",
                isActive ? "bg-white/5 text-white shadow-glass-soft" : "text-pearl/40 hover:text-pearl/80 hover:bg-white/5"
              )}
            >
              <Icon 
                size={20} 
                className={cn("transition-transform duration-500", isActive && "scale-110")} 
              />
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-4 text-xs font-display tracking-widest uppercase"
                >
                  {label}
                </motion.span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 w-1 h-4 bg-aurora rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 flex flex-col items-center">
        <button
          onClick={toggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-pearl/40 hover:text-white transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Tab Content Display (Floating Layer) */}
      <AnimatePresence>
        {sidebarOpen && (sidebarTab === "chats" || sidebarTab === "history" || sidebarTab === "files") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col p-4 overflow-hidden"
          >
             <div className="h-[1px] w-full bg-white/5 mb-6" />
             {(sidebarTab === "chats" || sidebarTab === "history") && <ChatHistory />}
             {sidebarTab === "files" && <FileExplorer />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resizer */}
      {sidebarOpen && (
        <div
          onMouseDown={startResize}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-aurora/40 transition-colors z-30"
        />
      )}
    </motion.aside>
  );
}

