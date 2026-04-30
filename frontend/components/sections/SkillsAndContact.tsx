"use client";

import React from "react";
import { Mail, Github, Linkedin } from "lucide-react";

export function SkillsAndContact() {
  const skills = [
    "Python", "TypeScript", "React / Next.js", "FastAPI",
    "Agentic AI", "Graph Neural Networks", "LLM Orchestration",
    "Cyber Defense & SOC", "System Architecture", "Docker / Monorepo"
  ];

  return (
    <section className="py-20">
      <div className="container grid grid-cols-2 gap-8">
        
        {/* Skills */}
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Technical Arsenal</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {skills.map((skill, index) => (
              <span 
                key={index} 
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  color: '#ccc'
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="glass-panel" style={{ background: 'var(--background)' }}>
          <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Initiate Connection</h2>
          <p style={{ color: '#888', marginBottom: '2rem', lineHeight: 1.6 }}>
            Looking to collaborate on bleeding-edge autonomous systems or secure national infrastructure? My communication channels are open.
          </p>

          <div className="flex flex-col gap-4">
             <a href="mailto:hello@example.com" className="btn" style={{ textAlign: 'center' }}>
               <Mail size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
               Secure Transmission
             </a>
             <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                <a href="https://github.com/Tashima-Tarsh" className="btn" style={{ flex: 1, textAlign: 'center', borderColor: '#444', color: '#fff' }}>
                  <Github size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                  GitHub Repository
                </a>
                <a href="#" className="btn" style={{ flex: 1, textAlign: 'center', borderColor: '#0077b5', color: '#0077b5' }}>
                  <Linkedin size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                  LinkedIn
                </a>
             </div>
          </div>
        </div>

      </div>
    </section>
  );
}
