import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/notifications/ToastProvider";
import { JarvisProvider } from "@/components/layout/JarvisProvider";
import { StartupScreen } from "@/components/layout/StartupScreen";
import { JarvisOrb } from "@/components/ui/JarvisOrb";
import type React from "react";
import { useState, } from "react";
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
  title: "DISHA v5.0.0 | The Autonomous Cognitive Operating System",
  description: "DISHA is an elite AGI platform integrating multi-agent reasoning, cognitive loops, and domain-specific intelligence (Cyber, Quantum, Strategy). Built for the future of digital defense.",
  keywords: ["AGI", "Cognitive AI", "Cyber Defense", "Security Operations", "Quantum Computing", "Autonomous Intelligence"],
  openGraph: {
    title: "DISHA v5.0.0 | Autonomous Cognitive AGI",
    description: "The world-class 7-layer AGI platform for intelligence and defense.",
    images: ["/docs/images/banner_v5.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DISHA v5.0.0 | AGI Ecosystem",
    description: "Empowering the top 1% organizations with cognitive decision systems.",
    images: ["/docs/images/banner_v5.png"],
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} ${plusJakartaSans.variable} font-sans antialiased bg-background text-foreground h-full w-full overflow-hidden relative selection:bg-primary/30`}>
        {/* DISHA v5.0.0 — QUANTUM CORE BASE */}
        <div className="quantum-grid fixed inset-0 pointer-events-none opacity-20" />
        
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
