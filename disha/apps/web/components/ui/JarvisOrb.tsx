"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useJarvis } from "@/components/layout/JarvisProvider";

export const JarvisOrb = () => {
  const { isSpeaking, isListening, listen, speak, status } = useJarvis();

  return (
    <div className="fixed bottom-12 right-12 z-[60] flex flex-col items-center group">
      {/* Voice Wave Visualizer (appearing when speaking/listening) */}
      <AnimatePresence>
        {(isSpeaking || isListening) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="mb-6 flex items-center space-x-1 h-4"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: isSpeaking ? [4, 16, 4] : [4, 8, 4],
                }}
                transition={{
                  duration: 0.5 + i * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`w-0.5 rounded-full ${isListening ? 'bg-sunset' : 'bg-aurora'}`}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Elite Aura Core */}
      <motion.button
        onClick={() => !isListening && listen()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-20 h-20 flex items-center justify-center cursor-pointer outline-none"
      >
        {/* Outer Glow Layer 1 */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inset-0 rounded-full blur-2xl ${
            isListening ? "bg-sunset/40" : "bg-aurora/30"
          }`}
        />

        {/* Outer Glow Layer 2 */}
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inset-0 rounded-full blur-3xl ${
            isSpeaking ? "bg-royal/30" : "bg-aurora/20"
          }`}
        />

        {/* The Intelligent Heart */}
        <div className="relative w-12 h-12 rounded-full glass-elite flex items-center justify-center overflow-hidden border-white/10">
          <motion.div
            animate={{
              rotate: 360,
              scale: isSpeaking ? [1, 1.2, 1] : 1,
            }}
            transition={{
              rotate: { duration: 15, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity }
            }}
            className="absolute inset-0 opacity-60"
            style={{
              background: isListening 
                ? "radial-gradient(circle at center, var(--brand-sunset), transparent)" 
                : "radial-gradient(circle at center, var(--brand-aurora), transparent)"
            }}
          />
          
          {/* Center Pulse */}
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-white shadow-[0_0_15px_#ffffff]" 
          />
        </div>
      </motion.button>

      {/* Subtle Status Label */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-[10px] font-display uppercase tracking-[0.4em] text-pearl"
          >
            Listening
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

