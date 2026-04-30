# DISHA Project Governance & Architecture

## Objective
DISHA (Digital Intelligence & Sovereign Healing Architecture) is a production-grade AGI platform. This document defines the rules for development, architecture, and system integrity.

## Architecture Standards (Clean Architecture)

### 1. Backend Layering
- **API**: Controllers and route handlers. Zero business logic. Uses Pydantic for input/output.
- **Services**: Pure business logic. Interacts with models and external integrations.
- **Models**: Database schemas (SQLAlchemy/Neo4j) and Pydantic validation schemas.
- **Utils**: Shared helpers (logging, crypto, formatting).
- **Core**: Global configuration, security protocols, and shared constants.

### 2. Frontend Layering
- **Components**: Reusable, atomic UI elements.
- **Layout**: Persistent UI structures (Sidebar, Navbar).
- **Pages**: Screen-level components and state orchestration.
- **Hooks**: Logic separation from UI components.

## Coding Standards
- **Python**: 
  - Mandatory type hints (`from __future__ import annotations`).
  - Async/Await for all I/O bound operations.
  - Pydantic v2 for all data validation.
  - Follow PEP8 via Ruff/Flake8.
- **JavaScript/React**:
  - TypeScript mandatory.
  - Functional components with hooks.
  - Tailwind CSS for styling using the Design System.

## Design System
- **Primary Color**: `#4F46E5` (Indigo-600)
- **Background**: `#0F172A` (Slate-900)
- **Accent**: `#10B981` (Emerald-500)
- **Text**: White (Primary), Slate-400 (Secondary)

## Auto-Improvement Behavior
- Every refactor must include an audit of dependencies.
- Any new feature must follow the 7-stage cognitive loop (Perception -> Action -> Reflection).
- Security first: No PII logging, mandatory Argon2id for hashing.
