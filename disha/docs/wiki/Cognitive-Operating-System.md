# The Cognitive Operating System (DISHA-MIND)

At the heart of DISHA is a biological-inspired reasoning engine that transcends traditional linear LLM prompting.

## 🧠 The 7-Stage Intelligence Cycle

### 1. Perceive
Converts raw signal into structured entities. It uses **Multimodal Fusion** to correlate video frames, audio transcripts, and log files into a unified intent.

### 2. Attend
Filters the overwhelming "Signal Noise" by focusing on entities stored in the **Semantic Memory (Neo4j)** and **Episodic Memory (ChromaDB)**.

### 3. Reason
Generates parallel world-states. DISHA doesn't just ask "What is this?", it asks "How does this impact national resilience?".

### 4. Deliberate
The most critical stage. Multiple agents (Planner, Critic, Safety-Gate) perform a consensus vote. If a decision path is <85% confidence, it is escalated for human review.

### 5. Act
Execution. This might mean generating a report, initiating a self-healing restart of a docker service, or blocking a malicious IP.

### 6. Reflect
The system reviews its own actions. Did the restart fix the service? Did the reasoning align with the ultimate outcome?

### 7. Consolidate
Post-investigation knowledge update. The successful reasoning paths are stored as "Few-Shot" examples for future cycles.

---

## 🔄 Self-Improving Prompts

DISHA uses an **Evolutionary Strategy** to optimize its own internal prompts.
- **Population**: 5 variants per prompt template.
- **Mutation**: successful investigation paths trigger structural mutation in the system prompt.
- **Crossover**: Winning prompts are merged to create high-resilience reasoning "Genotypes".
