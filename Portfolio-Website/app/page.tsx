import React from "react";
import { Hero } from "@/components/sections/Hero";
import { FeaturedProject } from "@/components/sections/FeaturedProject";
import { SkillsAndContact } from "@/components/sections/SkillsAndContact";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <FeaturedProject />
      <SkillsAndContact />

      <footer className="py-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#666', fontSize: '0.875rem' }}>
        <p>© {new Date().getFullYear()} Tashima Tarsh. All Systems Online.</p>
      </footer>
    </main>
  );
}
