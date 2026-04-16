"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, AlertTriangle, Activity, Map as MapIcon, Zap, Globe } from "lucide-react";

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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
              transition={{ duration: 1 }}
              className="h-full flex items-center justify-center p-6"
            >
               <div className="text-center space-y-8 max-w-4xl cursor-pointer" onClick={() => setHasStarted(true)}>
                  <motion.div 
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-sovereign/30 bg-sovereign/10 text-sovereign text-xs font-mono tracking-widest uppercase mb-4"
                  >
                    <Globe size={14} className="animate-spin-slow" />
                    Sovereign Intelligence Platform
                  </motion.div>
                  <h1 className="text-7xl md:text-9xl font-display text-gradient leading-tight tracking-tighter">
                    DISHA <span className="text-brand-gradient">v6.0</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-foreground/50 font-sans max-w-2xl mx-auto leading-relaxed">
                    The Intelligent Guardian of National Security, Citizen Safety, and Autonomous Resilience.
                  </p>
                  <div className="pt-12">
                     <button className="btn-premium px-12 py-5 text-lg group">
                        Enter Command Center
                        <motion.span 
                          className="inline-block ml-2"
                          animate={{ x: [0, 5, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                          →
                        </motion.span>
                     </button>
                  </div>
               </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 md:p-12 max-w-[1600px] mx-auto space-y-8"
            >
              {/* Top Priority Alerts - DISHA v6 Feature */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h2 className="text-3xl font-display text-white">National Command Dashboard</h2>
                        <p className="text-foreground/40 font-mono text-xs uppercase tracking-widest text-brand-gradient">Sovereign Protection Active</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                           SENTINEL-OK
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono flex items-center gap-2">
                           <Zap size={14} />
                           AUTO-HEAL: 100%
                        </div>
                      </div>
                    </div>

                    <div className="glass-premium p-1 rounded-3xl overflow-hidden min-h-[500px] relative border-primary/5 group">
                       {/* Mock Map View */}
                       <div className="absolute inset-0 bg-[#0a0a0f] quantum-grid opacity-50" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative w-full h-full p-8 flex flex-col justify-between">
                             <div className="flex justify-end gap-2">
                                <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors">
                                   <MapIcon size={20} />
                                </button>
                                <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors">
                                   <Activity size={20} />
                                </button>
                             </div>
                             
                             <div className="space-y-4 max-w-md">
                                <div className="glass-premium p-6 rounded-2xl border-sovereign/20 glow-sovereign">
                                   <div className="flex items-start gap-4">
                                      <div className="w-10 h-10 rounded-full bg-sovereign/20 flex items-center justify-center text-sovereign shrink-0">
                                         <AlertTriangle size={20} />
                                      </div>
                                      <div className="space-y-1">
                                         <h4 className="text-sovereign font-bold">Flood Risk Warning</h4>
                                         <p className="text-sm text-foreground/60 leading-snug">District 7 telemetry shows 85% probability of overflow within 6 hours. Alerts dispatched.</p>
                                      </div>
                                   </div>
                                </div>

                                <div className="glass-premium p-6 rounded-2xl border-red-500/20 glow-red">
                                   <div className="flex items-start gap-4">
                                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                                         <Shield size={20} />
                                      </div>
                                      <div className="space-y-1">
                                         <h4 className="text-red-500 font-bold">Cyber Intrusion Detected</h4>
                                         <p className="text-sm text-foreground/60 leading-snug">DDoS attempts on Power Grid Node C isolated. Sentinel auto-repair success.</p>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-xl font-display text-foreground/80">Protection Modules</h3>
                    <div className="space-y-4">
                       {[
                         { title: "Disaster Forecaster", desc: "Flood, Heatwave, Tectonic Monitoring", icon: Globe, color: "text-blue-400" },
                         { title: "Crime Sentinel", desc: "Real-time hotspot & pattern prediction", icon: Shield, color: "text-red-400" },
                         { title: "Public Safety", desc: "Citizen alert & emergency dispatch", icon: AlertTriangle, color: "text-sovereign" },
                         { title: "Cyber Defense", desc: "Zero-trust autonomous threat hunting", icon: Zap, color: "text-accent" },
                         { title: "Governance", desc: "Audit logs & Human-in-the-loop", icon: Activity, color: "text-green-400" },
                       ].map((module, i) => (
                         <div key={i} className="card-luxury p-5 border-white/5 hover:bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                               <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${module.color}`}>
                                  <module.icon size={20} />
                               </div>
                               <div>
                                  <h4 className="text-sm font-bold text-white">{module.title}</h4>
                                  <p className="text-[10px] text-foreground/40 uppercase tracking-tighter">{module.desc}</p>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Premium Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-luxury-float opacity-50" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[140px] animate-luxury-float opacity-30" style={{ animationDelay: "3s" }} />
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-sovereign/5 rounded-full blur-[100px] animate-pulse opacity-20" />
      </div>
    </main>
  );
}
