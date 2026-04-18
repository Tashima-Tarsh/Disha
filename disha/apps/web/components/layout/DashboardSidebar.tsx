"use client";

import React from "react";
import { 
  Plus, 
  Bot, 
  ShieldAlert, 
  Database, 
  Activity, 
  Settings, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  User
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon: Icon, label, active, collapsed, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative",
        active 
          ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
          : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon size={20} className={cn("shrink-0", active && "text-ms-blue")} />
      {!collapsed && (
        <span className="text-sm font-medium tracking-wide whitespace-nowrap overflow-hidden">
          {label}
        </span>
      )}
      
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="absolute left-0 w-1 h-6 bg-ms-blue rounded-r-full"
        />
      )}
    </button>
  );
}

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("Chat");

  const menuItems = [
    { icon: MessageSquare, label: "New Chat" },
    { icon: Bot, label: "Agents" },
    { icon: ShieldAlert, label: "Security Center" },
    { icon: Database, label: "Repo Analyzer" },
    { icon: Activity, label: "Threat Monitor" },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-full bg-obsidian/50 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-500 relative z-30"
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all z-50"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Profile Area */}
      <div className="p-6">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
            <User className="text-white/40" size={20} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">Administrator</span>
              <span className="text-[10px] text-white/30 truncate uppercase tracking-widest">Level 5 Clearance</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Menu */}
      <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => (
          <SidebarItem 
            key={item.label}
            {...item}
            active={activeTab === item.label}
            collapsed={collapsed}
            onClick={() => setActiveTab(item.label)}
          />
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/5 bg-white/[0.02]">
        <SidebarItem 
          icon={Settings} 
          label="Settings" 
          collapsed={collapsed}
          onClick={() => setActiveTab("Settings")}
          active={activeTab === "Settings"}
        />
      </div>
    </motion.div>
  );
}
