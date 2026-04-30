"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Brain, Network } from "lucide-react";

export function FeaturedProject() {
  return (
    <section id="disha" className="py-20 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-panel"
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          {/* Subtle decoration inside the glass panel */}
          <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '100%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(245, 176, 65, 0.05) 0%, rgba(0,0,0,0) 60%)', zIndex: -1 }}></div>

          <div className="flex flex-col mb-8 text-center">
            <h3 style={{ color: 'var(--sovereign)', fontWeight: 600, letterSpacing: '2px', fontSize: '0.875rem', marginBottom: '0.5rem' }}>FLAGSHIP PLATFORM</h3>
            <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>DISHA v6.0</h2>
            <p style={{ maxWidth: '700px', margin: '1rem auto', color: '#aaa', lineHeight: 1.6 }}>
              The Intelligent Guardian of National Security. A 7-Layer AGI Operating System combining multi-agent reasoning, deterministic cognitive loops, and Graph Neural Networks for autonomous decision making and cyber defense.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6" style={{ marginTop: '3rem' }}>
            <div className="glass-panel" style={{ background: 'rgba(5, 5, 5, 0.6)' }}>
              <Brain color="var(--primary)" size={32} className="mb-4" />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Cognitive Engines</h4>
              <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Engineered custom hybrid reasoners mimicking human abduction. Dynamic multi-model orchestration routing between local LLMs and external high-parameter brains.
              </p>
            </div>

            <div className="glass-panel" style={{ background: 'rgba(5, 5, 5, 0.6)' }}>
              <Shield color="var(--secondary)" size={32} className="mb-4" />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Sentinel SOC</h4>
              <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Fully autonomous zero-trust cyber defense. Integrating continuous vulnerability scanning and automated remediation through the DISHA Mythos module.
              </p>
            </div>

            <div className="glass-panel" style={{ background: 'rgba(5, 5, 5, 0.6)' }}>
              <Network color="var(--sovereign)" size={32} className="mb-4" />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>GNN Threat Prediction</h4>
              <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Using PyTorch Geometric, trained to classify hostile nodes and predict sophisticated attack networks in real-time.
              </p>
            </div>
            
            <div className="glass-panel" style={{ background: 'rgba(5, 5, 5, 0.6)' }}>
              <div style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: '#000', borderRadius: '4px', display: 'inline-block', fontWeight: 600, marginBottom: '1rem', fontSize: '0.85rem' }}>
                Tech Stack
              </div>
              <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.8 }}>
                <strong>Backend:</strong> Python, FastAPI, PyTorch, Neo4j<br />
                <strong>Frontend:</strong> Next.js, Framer Motion, Vanilla CSS<br />
                <strong>Architecture:</strong> Monorepo, Microservices, Agentic
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
