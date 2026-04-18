"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ChatInterface } from "@/components/dashboard/ChatInterface";
import { SecurityDashboard } from "@/components/dashboard/SecurityDashboard";
import { motion } from "framer-motion";

export default function Dashboard() {
  return (
    <main className="h-screen w-full bg-obsidian relative overflow-hidden flex flex-col">
      {/* Background Layers */}
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="absolute inset-0 cyber-grid-small opacity-5 pointer-events-none" />
      
      {/* Atmospheric Glows */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-ms-blue/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-ey-yellow/5 blur-[120px] rounded-full pointer-events-none" />

      <Header />
      
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Sidebar */}
        <DashboardSidebar />

        {/* Main Content Area (Chat) */}
        <div className="flex-1 flex flex-col bg-white/[0.01] border-x border-white/5 relative">
          <ChatInterface />
        </div>

        {/* Right Dashboard Sidebar (Security) */}
        <div className="w-[340px] hidden xl:flex flex-col bg-obsidian/40 backdrop-blur-xl border-l border-white/5">
           <SecurityDashboard />
        </div>
      </div>

      {/* Modern Status Bar */}
      <footer className="h-8 border-t border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 relative z-30">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-ms-blue shadow-[0_0_8px_rgba(0,164,239,0.5)]" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold">Encrypted Connection</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold">Threat Monitor: Stable</span>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-white/20 uppercase">Latency: 24ms</span>
              <div className="flex items-center gap-0.5">
                 {[1, 2, 3, 4].map(i => <div key={i} className="w-0.5 h-2 bg-ms-blue/40 rounded-full" />)}
              </div>
           </div>
        </div>
      </footer>
    </main>
  );
}
