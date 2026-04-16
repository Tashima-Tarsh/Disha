import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Disha AGI Platform",
  description: "Self-learning, multi-agent AGI platform — threat intelligence, cyber defense, RL optimization, and multimodal analysis",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen cyber-grid-bg text-[var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
