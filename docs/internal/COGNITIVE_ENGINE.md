# The 7-Stage Cognitive Engine

At the core of DishaOS is `cognitive_loop.py`, a biological-inspired state machine that processes every incoming request through seven distinct phases.

## The Cognitive Sequence

### 1. Perceive
**Extraction of Intent & Entities**
The engine parses the raw input using Regex and heuristic mapping to identify the primary intent (`investigate`, `explain`, `plan`, `threat`) and extracts critical entities (IP addresses, domains, etc.). It calculates an initial **uncertainty score** based on the input's brevity and complexity.

### 2. Attend
**Contextual Retrieval**
The `MemoryManager` is engaged. It pulls from:
- **Working Memory:** Recent turns in the current session.
- **Episodic Memory:** Past outcomes of similar inputs.
- **Semantic Memory:** Learned concepts.
*Crucially, working memory decays autonomously by a factor of 0.92 every turn, simulating biological forgetting of irrelevant context.*

### 3. Reason
**Hypothesis Generation**
The `HybridReasoner` ingests the perceived entities and attended memories. It generates multiple competing hypotheses using one of three modes:
- **Symbolic:** Rule-based logic.
- **Neural:** Dense vector associations.
- **Quantum-Inspired:** Superposition probability scoring for highly ambiguous scenarios.

### 4. Deliberate
**Multi-Agent Consensus**
The generated hypotheses are sent to the `DecisionNexus`. Here, specialized agents (Political, Legal, Security, Ideology) debate the outcomes. They produce a consensus recommendation and log any dissenting views. 

### 5. Act
**Confidence & Execution**
The engine calculates a final confidence score by averaging the hypothesis confidence and the deliberation consensus. If the score falls below the `CONFIDENCE_THRESHOLD` (0.45), the engine safely aborts and asks the user for clarification. Otherwise, it formulates the action.

### 6. Reflect
**Introspection**
Before concluding the turn, the engine evaluates its own performance. It calculates a reflection quality score based on agent convergence, memory retrieval success, and hypothesis diversity. If agents diverged wildly, it flags a `learning_trigger`.

### 7. Consolidate
**Long-Term Memory Promotion**
The turn is summarized into an episode. If the reflection quality is high, new entities are learned and promoted into Semantic Memory (the Knowledge Graph), making the AGI smarter for the next session.
