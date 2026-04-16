"use client";

import React from "react";
import { motion } from "framer-motion";
import { MoveRight } from "lucide-react";

export function Hero() {
  return (
    <section className="py-20 flex flex-col items-center justify-center min-h-[70vh] text-center relative">
      <div className="bg-glow"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="container"
      >
        <h2 style={{ fontSize: '1rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1.5rem' }}>
          Tashima Tarsh
        </h2>
        
        <h1 className="text-gradient" style={{ fontSize: '4rem', lineHeight: '1.1', marginBottom: '1.5rem' }}>
          Architecting Autonomous<br />Cognitive Intelligence
        </h1>
        
        <p style={{ maxWidth: '600px', margin: '0 auto 3rem auto', fontSize: '1.1rem', color: '#888', lineHeight: '1.6' }}>
          I build sovereign AI ecosystems, quantum-resilient defense grids, and highly complex orchestrators operating at the bleeding edge of AGI.
        </p>

        <a href="#disha" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          Explore Flagship Project
          <MoveRight size={18} />
        </a>
      </motion.div>
    </section>
  );
}
