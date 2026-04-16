# Architecture Decision Log (ADL)

This document tracks significant architectural decisions made during the evolution of the **DISHA Platform**.

## ADL-001: Transition to Monorepo (v6.0.0)
- **Status**: Accepted
- **Context**: The legacy DISHA framework used decoupled repositories, making it difficult to maintain cross-service type safety and unified CI/CD pipelines.
- **Decision**: Restructure the entire ecosystem into a single Bun-managed monorepo with `/apps`, `/services`, and `/ai` clusters.
- **Consequences**: Improved developer velocity and atomic releases; requires strictly managed workspace pathing.

## ADL-002: Sovereign Intelligence Branding (v5.0.0)
- **Status**: Accepted
- **Context**: The project initial identity was purely a "cyber-tool". To reach enterprise and national tiers, a broader "Sovereign Intelligence" positioning was needed.
- **Decision**: Completely rebrand to "Digital Intelligence & Strategic Holistic Analysis" (DISHA).
- **Consequences**: Shifted focus toward national resilience, multi-physics, and judicial auditing.

## ADL-003: 7-Stage Cognitive Loop (v1.0.0)
- **Status**: Fundamental
- **Context**: Simple LLM chains were insufficient for high-stakes strategic reasoning.
- **Decision**: Implement a biological-inspired cycle (Perceive to Consolidate).
- **Consequences**: Higher latency per query but significantly increased precision and self-correction capabilities.

## ADL-004: Standardizing on Bun (v5.0.0)
- **Status**: Accepted
- **Context**: Node.js package management was slow in deep monorepo structures.
- **Decision**: Adopt Bun as the primary workspace runner and bundler.
- **Consequences**: ~3x faster builds; required minor adjustments to some Node-native C++ modules.

## ADL-005: Defense-First (Sentinel) Architecture
- **Status**: Permanent
- **Context**: Need for an autonomous layer that can operate when the main loop is deliberating.
- **Decision**: Split the security logic into an independent background orchestrator (Sentinel).
- **Consequences**: Provides a "Shield" that can act in milliseconds while the "Brain" thinks in seconds.
