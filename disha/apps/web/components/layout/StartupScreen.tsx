"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const StartupScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [status, setStatus] = useState("INITIALIZING COGNITIVE ARCHITECTURE");

  const statuses = [
    "ALIGNING NEURAL PARAMETERS",
    "DECRYPTING ELITE PROTOCOLS",
    "SYNCING OMNIGRAVITY SUBSTRATE",
    "SYSTEMS READY",
  ];

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < statuses.length) {
        setStatus(statuses[currentIdx]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 1200);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-midnight flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      {/* Soft Background Aurora */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-radial-gradient from-aurora/10 to-transparent pointer-events-none" 
      />

      {/* Luxury Central Core */}
      <div className="relative flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "circOut" }}
          className="relative"
        >
          {/* Main Glow */}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 50px rgba(79, 70, 229, 0.1)", 
                "0 0 100px rgba(79, 70, 229, 0.3)", 
                "0 0 50px rgba(79, 70, 229, 0.1)"
              ],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-32 h-32 rounded-full border border-white/5 flex items-center justify-center bg-white/5 backdrop-blur-3xl"
          >
             {/* Inner Core */}
             <motion.div 
               animate={{ scale: [1, 1.1, 1] }}
               transition={{ duration: 3, repeat: Infinity }}
               className="w-4 h-4 rounded-full bg-white shadow-[0_0_20px_#ffffff]" 
             />
          </motion.div>
        </motion.div>

        {/* Floating Rings (Subtle) */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-8 border border-white/5 rounded-full"
        />
      </div>

      {/* Typographic Identity */}
      <div className="mt-24 text-center space-y-6">
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-white font-display text-4xl tracking-[1em] font-light ml-[1em]"
        >
          DISHA
        </motion.h1>
        
        <motion.div
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-pearl/40 font-sans text-xs tracking-[0.3em] font-medium uppercase"
        >
          {status}
        </motion.div>
      </div>

      {/* Refined Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-12 text-pearl/20 text-[10px] tracking-[0.5em] font-light"
      >
        ELITE COGNITIVE SYSTEMS © 2026
      </motion.div>
    </motion.div>
  );
};

