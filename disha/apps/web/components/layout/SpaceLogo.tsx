"use client";

import React from "react";
import { motion } from "framer-motion";

interface SpaceLogoProps {
  className?: string;
  variant?: "diksha" | "msey" | "both";
}

export function SpaceLogo({ className = "", variant = "both" }: SpaceLogoProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {(variant === "diksha" || variant === "both") && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5"
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center p-1.5 backdrop-blur-sm">
             <div className="w-full h-full border-2 border-white/40 rounded-sm rotate-45 shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter text-white">
            DIKSHA
          </span>
        </motion.div>
      )}

      {variant === "both" && (
        <div className="h-6 w-px bg-white/5 mx-2" />
      )}

      {(variant === "msey" || variant === "both") && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-0.5"
        >
          <span className="text-2xl font-display font-bold tracking-tighter text-ms-blue">
            MS
          </span>
          <span className="text-2xl font-display font-bold tracking-tighter text-ey-yellow">
            EY
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-ey-yellow animate-pulse ml-1.5 shadow-[0_0_10px_#ffe600]" />
        </motion.div>
      )}
    </div>
  );
}
