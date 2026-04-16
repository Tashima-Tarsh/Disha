"use client";

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
            className="text-[10px] uppercase font-display tracking-[0.6em] text-primary/80"
          >
            v5.0.0 Global Platform
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 1 }}
            className="text-5xl md:text-8xl font-display tracking-tight text-gradient font-light"
          >
            Evolve Your <br />
            <span className="font-medium italic">Digital Soul</span>
          </motion.h2>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="text-foreground/60 font-sans text-xl max-w-2xl mx-auto leading-relaxed"
        >
          DISHA is more than intelligence. It is the architectural foundation for a world where AI perceives, deliberates, and learns with the elegance of biological thought.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="flex items-center justify-center space-x-6 pt-8"
        >
          <motion.button
            onClick={onStart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-premium"
          >
            Launch Core Ecosystem
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Quantum Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-30 px-24">
         <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
         <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] animate-pulse" />
      </div>
    </div>
  );
}
