"use client";

import React from "react";
import { motion } from "framer-motion";

export function EliteHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl w-full text-center space-y-12 z-10"
      >
        <div className="space-y-4">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-[10px] uppercase font-display tracking-[0.6em] text-aurora/60"
          >
            Elite Cognitive Architecture
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 1 }}
            className="text-5xl md:text-7xl font-display tracking-tight text-gradient-pearl font-light"
          >
            The Future of <br />
            <span className="font-medium">Intelligent Thought</span>
          </motion.h2>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="text-pearl/40 font-sans text-lg max-w-2xl mx-auto leading-relaxed"
        >
          Welcome to the world-class cognitive ecosystem. DISHA ELITE leverages next-generation multi-agent intelligence to solve the most complex challenges with unparalleled precision and elegance.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="flex items-center justify-center space-x-6"
        >
          <motion.button
            onClick={onStart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-5 rounded-full bg-white text-midnight font-display text-sm tracking-widest uppercase font-bold shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
          >
            Initialize Uplink
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Atmospheric Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-aurora/10 rounded-full blur-[160px]" />
         <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-royal/10 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
