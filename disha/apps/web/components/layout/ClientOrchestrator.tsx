"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { StartupScreen } from "@/components/layout/StartupScreen";
import { JarvisOrb } from "@/components/ui/JarvisOrb";

export function ClientOrchestrator({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);

  return (
    <AnimatePresence mode="wait">
      {isInitializing ? (
        <StartupScreen key="startup" onComplete={() => setIsInitializing(false)} />
      ) : (
        <div key="main" className="h-full w-full animate-in fade-in duration-700">
          {children}
          <JarvisOrb />
        </div>
      )}
    </AnimatePresence>
  );
}
