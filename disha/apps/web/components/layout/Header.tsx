"use client";

import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useChatStore } from "@/lib/store";
import { MODELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { motion } from "framer-motion";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useChatStore();

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  } as const;

  const ThemeIcon = themeIcons[theme];
  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";

  return (
    <header className="flex items-center justify-between px-8 py-5 h-20 bg-card/40 backdrop-blur-xl border-b border-white/5 z-10 relative">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-display tracking-[0.4em] text-primary uppercase mb-0.5 ml-0.5">
            DISHA v5.0
          </span>
          <h1 className="text-sm font-display tracking-[0.2em] font-medium text-white uppercase">
            Cognitive Hub
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Model selector - Redesigned as a Luxury dropdown */}
        <div className="relative group">
          <label htmlFor="model-select" className="sr-only">
            Model
          </label>
          <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-500 cursor-pointer group">
             <span className="text-[10px] font-display tracking-widest text-pearl/40 uppercase">
               Engine
             </span>
             <select
               id="model-select"
               value={settings.model}
               onChange={(e) => updateSettings({ model: e.target.value })}
               className="appearance-none bg-transparent text-xs font-display tracking-wider text-white focus:outline-none cursor-pointer pr-4"
             >
               {MODELS.map((m) => (
                 <option key={m.id} value={m.id} className="bg-midnight text-white">
                   {m.label}
                 </option>
               ))}
             </select>
             <ChevronDown size={14} className="text-pearl/40 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Global Tools */}
        <div className="flex items-center gap-4 h-8 border-l border-white/5 pl-8">
          <NotificationCenter />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} theme`}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-pearl/40 hover:text-white transition-all duration-300"
          >
            <ThemeIcon size={16} />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
