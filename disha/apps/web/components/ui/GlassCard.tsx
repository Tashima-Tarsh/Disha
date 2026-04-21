"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  hover?: boolean;
  glowColor?: "cyan" | "indigo" | "purple" | "none";
}

export function GlassCard({
  children,
  className = "",
  animate = true,
  hover = true,
  glowColor = "none"
}: GlassCardProps) {
  const glowStyles = {
    cyan: "hover:shadow-[0_0_30px_rgba(0,242,255,0.15)] hover:border-cyan-glow/30",
    indigo: "hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:border-indigo-pulse/30",
    purple: "hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:border-msey-purple/30",
    none: "hover:border-white/20"
  };

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={animate ? { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } : undefined}
      className={cn(
        "glass-premium rounded-3xl p-6 transition-all duration-500",
        hover && "hover:-translate-y-1 hover:bg-card/40",
        glowColor !== "none" && glowStyles[glowColor],
        className
      )}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent opacity-20" />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
