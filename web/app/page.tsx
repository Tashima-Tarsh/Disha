"use client";

import React, { useState } from "react";
import { EliteHero } from "@/components/layout/EliteHero";
import { Header } from "@/components/layout/Header";
import { AnimatePresence, motion } from "framer-motion";

export default function LandingPage() {
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <main className="h-full w-full bg-background relative overflow-hidden flex flex-col">
      <Header />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
              transition={{ duration: 1 }}
              className="h-full"
            >
              <EliteHero onStart={() => setHasStarted(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-preview"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-12 max-w-7xl mx-auto space-y-12"
            >
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-display text-gradient">System Core Initialized</h1>
                <p className="text-foreground/40 font-sans">v5.0.0 Global AGI Ecosystem Active</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="card-luxury">
                   <h3 className="text-xl font-display text-primary mb-2">Cognitive MIND</h3>
                   <p className="text-sm text-foreground/60 leading-relaxed">The 7-stage cognitive loop is processing real-time telemetry with 98% accuracy.</p>
                </div>
                <div className="card-luxury">
                   <h3 className="text-xl font-display text-accent mb-2">Sentinel Shield</h3>
                   <p className="text-sm text-foreground/60 leading-relaxed">ML Threat detection active. Honeypot traps deployed across 40 nodes.</p>
                </div>
                <div className="card-luxury">
                   <h3 className="text-xl font-display text-white mb-2">Quantum Edge</h3>
                   <p className="text-sm text-foreground/60 leading-relaxed">Qiskit circuit simulations verified. Physics engines operating at 12ms latency.</p>
                </div>
              </div>

              <div className="glass-premium p-8 rounded-3xl min-h-[400px] flex items-center justify-center border-primary/10">
                 <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-6" />
                    <p className="text-primary font-mono tracking-widest uppercase text-xs">Awaiting Neural Link...</p>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background Decorative Layer */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-luxury-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[100px] animate-luxury-float" style={{ animationDelay: "3s" }} />
      </div>
    </main>
  );
}
