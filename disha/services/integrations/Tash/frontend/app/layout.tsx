import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tashu Auditor Core",
  description: "AI Public Auditor Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
