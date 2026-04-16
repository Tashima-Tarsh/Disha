# Disha Auto-Learning Bot

Self-learning intelligence system with RAG, multi-agent architecture, and safe continuous learning.

## Architecture

```
auto-learning/
├── __init__.py                  # Package init
├── rag_pipeline.py              # RAG + FAISS vector retrieval pipeline
├── llama_finetuning.py          # LLaMA fine-tuning setup (LoRA/QLoRA)
├── multi_agent.py               # Multi-agent architecture
├── learning_controller.py       # Continuous learning controller
├── advanced_reasoning.py        # Mythos-style advanced reasoning protocol
├── requirements.txt             # Dependencies
├── README.md                    # This file
└── tests/
    ├── test_rag_pipeline.py
    ├── test_llama_finetuning.py
    ├── test_multi_agent.py
    ├── test_learning_controller.py
    └── test_advanced_reasoning.py
```

## Modules

### RAG + FAISS Pipeline (`rag_pipeline.py`)
- FAISS-backed vector index with sentence-transformer embeddings
- Document ingestion with automatic deduplication
- Semantic search and RAG-augmented prompt generation
- Index persistence (save/load)
- Graceful fallback when FAISS/sentence-transformers unavailable

### LLaMA Fine-Tuning (`llama_finetuning.py`)
- LoRA and QLoRA adapter configuration
- Dataset preparation and validation (JSONL format)
- Training loop with checkpointing
- **Never triggered automatically** — requires human-approved dataset aggregation
- Environment check for GPU/dependency availability

### Multi-Agent Architecture (`multi_agent.py`)
- **DataCollectorAgent**: Gathers data from various sources
- **QualityAnalystAgent**: Scores data quality (0–100)
- **EmbeddingAgent**: Converts data to vector embeddings
- **ReasoningAgent**: Multi-path problem decomposition
- **KnowledgeManagerAgent**: Manages permanent/temporary/rejected stores
- **AgentOrchestrator**: Coordinates agents via message-passing

### Continuous Learning Controller (`learning_controller.py`)
When new data is received:
1. Validate source credibility (stars, citations, origin)
2. Check for duplication
3. Score data quality (0–100)

| Score     | Action                        |
|-----------|-------------------------------|
| < 60      | **Reject**                    |
| 60–80     | Store in temporary memory     |
| > 80      | Store in permanent knowledge  |

- Data is converted to embeddings and stored in the vector database
- Fine-tuning is scheduled **only** after human-approved dataset aggregation
- Full audit logging of all ingestion decisions

### Advanced Reasoning Protocol (`advanced_reasoning.py`)
Mythos-style multi-path reasoning:
1. Decompose problem into sub-problems
2. Generate multiple solution paths
3. Evaluate each path (time/space complexity, scalability)
4. Select optimal approach (Correctness > Efficiency > Elegance)
5. Validate with edge cases
6. Present ranked alternatives if ambiguity exists

## Quick Start

```python
from auto_learning.rag_pipeline import RAGPipeline
from auto_learning.learning_controller import LearningController, DataItem
from auto_learning.multi_agent import AgentOrchestrator
from auto_learning.advanced_reasoning import AdvancedReasoningEngine

# 1. Set up RAG pipeline
rag = RAGPipeline(index_dir="data/rag_index")

# 2. Set up learning controller with RAG
controller = LearningController(rag_pipeline=rag)

# 3. Ingest data
controller.ingest(DataItem(
    text="Machine learning overview...",
    source="arxiv",
    metadata={"citations": 50, "peer_reviewed": True}
))

# 4. Query the knowledge base
results = rag.query("machine learning", top_k=5)

# 5. Use advanced reasoning
engine = AdvancedReasoningEngine(context_retriever=rag)
result = engine.reason("How to optimise neural network training?")
print(AdvancedReasoningEngine.format_result(result))

# 6. Fine-tuning (human-approved only)
proposal = controller.request_finetuning_approval()
controller.approve_finetuning(approved=True)
controller.export_finetuning_jsonl("data/finetuning.jsonl")
```

## Testing

```bash
cd auto-learning
pip install pytest
pytest tests/ -v
```

## Dependencies

Core modules have **zero mandatory dependencies** — all external libraries are optional with graceful fallbacks:

| Feature | Optional Dependencies |
|---------|----------------------|
| RAG/FAISS | `faiss-cpu`, `sentence-transformers`, `numpy` |
| Fine-tuning | `torch`, `transformers`, `peft`, `datasets`, `bitsandbytes` |
| Testing | `pytest` |
