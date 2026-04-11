import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Intelligence Platform",
  description: "Multi-agent AI system for OSINT, cybersecurity, and blockchain analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-900 text-gray-100">{children}</body>
    </html>
  );
}
