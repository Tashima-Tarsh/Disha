# DISHA OS: Visual Architecture Documentation

This document contains high-fidelity Mermaid diagrams representing the technical workflows and structures of the DISHA platform.

---

## 1. System Architecture (High-Level)
```mermaid
graph TD
    User((User)) -->|HTTPS/WS| Web[Next.js Command Center]
    Web -->|API Call| API[FastAPI Gateway]
    
    subgraph Intelligence_Core
        API --> CL[Cognitive Loop]
        CL --> Reasoner[Hybrid Reasoner]
        CL --> Nexus[Decision Nexus]
        Nexus --> Agent1[Political Agent]
        Nexus --> Agent2[Legal Agent]
        Nexus --> Agent3[Security Agent]
    end
    
    subgraph Memory_System
        CL --> WM[Working Memory]
        CL --> EM[Episodic Memory]
        CL --> SM[Semantic Memory]
    end
    
    subgraph Defense_Mesh
        HP[Honeypot Mesh] --> ML[PyTorch Anomaly Detection]
        ML --> API
    end
    
    CL --> Actions[System Actions]
```

---

## 2. The 7-Stage Intelligence Turn
```mermaid
sequenceDiagram
    participant U as User
    participant CL as Cognitive Loop
    participant M as Memory Manager
    participant DN as Decision Nexus
    
    U->>CL: Ingest Raw Input
    CL->>CL: 1. Perceive (Entities & Intent)
    CL->>M: 2. Attend (Load Context)
    M-->>CL: Working + Episodic Data
    CL->>CL: 3. Reason (Hypotheses)
    CL->>DN: 4. Deliberate (Agent Consensus)
    DN-->>CL: Consensus & Confidence
    CL->>U: 5. Act (Execute Response)
    CL->>CL: 6. Reflect (Performance Audit)
    CL->>M: 7. Consolidate (Memory Promotion)
```

---

## 3. Deployment Topology
```mermaid
graph LR
    subgraph "Production Environment (Docker)"
        A[FastAPI Container] --- B[Next.js Container]
        A --- C[Neo4j Graph]
        A --- D[Redis Ephemeral]
        A --- E[ChromaDB Vector]
        F[Honeypot Cluster] --- G[ML Monitor]
        G --- A
    end
```

---

## 4. CI/CD Flow
```mermaid
graph TD
    Commit[Git Push to main] --> Lint[Biome & Ruff Linting]
    Lint --> Test[Bun & Pytest Units]
    Test --> Security[Gitleaks & Bandit Scan]
    Security --> Deploy[Auto-Deploy to Swarm]
```
