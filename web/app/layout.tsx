import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/notifications/ToastProvider";
import { JarvisProvider } from "@/components/layout/JarvisProvider";
import { StartupScreen } from "@/components/layout/StartupScreen";
import { JarvisOrb } from "@/components/ui/JarvisOrb";
import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DISHA ELITE — The Future of Intelligence",
  description: "DISHA ELITE — A world-class, billion-dollar cognitive AGI platform designed for the top 1% elite organizations.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInitializing, setIsInitializing] = useState(true);

  return (
    <html lang="en" className="dark h-full w-full overflow-hidden" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} ${plusJakartaSans.variable} font-sans antialiased bg-midnight text-pearl selection:bg-aurora/30 h-full w-full overflow-hidden relative`}>
        {/* DISHA ELITE — AURORA MESH CORE */}
        <div className="aurora-mesh pointer-events-none" />
        
        <div className="relative z-10 h-full w-full overflow-hidden">
          <JarvisProvider>
            <ThemeProvider>
              <ToastProvider>
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
              </ToastProvider>
            </ThemeProvider>
          </JarvisProvider>
        </div>
      </body>
    </html>
  );
}
