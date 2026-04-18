"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <main className="h-screen w-full bg-obsidian relative overflow-hidden flex flex-col">
      {/* Background Layers */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 cyber-grid-small opacity-10 pointer-events-none" />
      
      {/* Dynamic Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-ms-blue/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-ey-yellow/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <Header />
      
      <div className="flex-1 overflow-y-auto flex items-center justify-center relative z-10 py-12">
        <AuthFlow />
      </div>

      {/* Footer Status */}
      <footer className="h-10 border-t border-white/5 bg-black/20 backdrop-blur-sm flex items-center justify-between px-6 relative z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Protected</span>
          </div>
          <div className="h-3 w-px bg-white/5" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan- glow animate-pulse" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Monitoring</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Session ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
        </div>
      </footer>
    </main>
  );
}
