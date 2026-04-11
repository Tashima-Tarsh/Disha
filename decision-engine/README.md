# Decision Engine — Multi-Agent Reasoning Framework

A modular AI framework that integrates **political**, **legal**, **ideological**, and **security** reasoning into a single multi-agent decision pipeline.

## Architecture

| Module | Description |
|--------|-------------|
| `political_engine.py` | Political strategy analysis |
| `legal_engine.py` | Constitutional + case-law retrieval (FAISS / keyword) |
| `ideology_engine.py` | Multi-philosophical ethical reasoning |
| `security_engine.py` | Threat modelling with optional OSINT |
| `main_decision_engine.py` | Orchestrator — combines all agents |

### Utilities

| File | Purpose |
|------|---------|
| `utils/retriever_faiss.py` | FAISS-based semantic retriever (sentence-transformers) |
| `utils/simple_retriever.py` | Keyword fallback retriever |
| `utils/text_segmenter.py` | Segment raw text into indexable clauses |
| `utils/build_faiss_index.py` | CLI to build a FAISS index |
| `utils/case_law_ingest.py` | Parse case-law files for indexing |
| `utils/osint.py` | Optional OSINT feed aggregator |
| `utils/llm_wrapper.py` | LLM abstraction (llama-cpp / mock) |

---

## Quick Start

```bash
# 1. Install core requirements
pip install -r decision-engine/requirements.txt

# 2. Run tests (mock provider — no GPU / model needed)
cd decision-engine
DISHA_MODEL_PROVIDER=mock python -m pytest tests/ -v
```

---

## Optional Dependencies

### FAISS retriever (semantic search)

```bash
pip install faiss-cpu sentence-transformers
```

### llama-cpp-python (local LLM)

```bash
pip install llama-cpp-python
```

---

## Building the Index

### Segment raw constitutional text

```bash
cd decision-engine
python -c "from utils.text_segmenter import segment_file; n = segment_file('data/raw/constitution_of_india.txt', 'data/index/constitution_clauses.txt'); print(f'Segmented {n} clauses')"
```

### Build FAISS index from clauses

```bash
cd decision-engine
python utils/build_faiss_index.py data/index/constitution_clauses.txt \
    --out data/index/constitution.faiss \
    --meta data/index/constitution_meta.json
```

### Ingest case-law

```bash
cd decision-engine
python -c "from utils.case_law_ingest import ingest; n = ingest('data/raw/case_law.txt', 'data/index/case_law_lines.txt', 'data/index/case_law_meta.json'); print(f'Ingested {n} cases')"
```

---

## Running with llama-cpp

```bash
# Download a GGUF model (example: Mistral-7B-Instruct)
# Place it at ./models/mistral-7b-instruct.gguf

export DISHA_MODEL_PROVIDER=llama_cpp
export DISHA_MODEL_PATH=./models/mistral-7b-instruct.gguf
export DISHA_MODEL_SEED=42

cd decision-engine
python -c "
from main_decision_engine import DecisionEngine
engine = DecisionEngine()
result = engine.decide('Should India implement a uniform civil code?')
import json; print(json.dumps(result, indent=2, default=str))
"
```

---

## Example with Mock LLM (no model needed)

```bash
cd decision-engine
DISHA_MODEL_PROVIDER=mock python -c "
from main_decision_engine import DecisionEngine
engine = DecisionEngine()
result = engine.decide('Evaluate digital privacy amendments to Article 21.')
for key in ('summary', 'confidence', 'recommendations'):
    print(f'{key}: {result[key]}')
"
```

---

## Output Structure

Every agent and the main decision engine return a dict with at least:

```json
{
  "summary": "...",
  "premises": ["..."],
  "inference_steps": ["..."],
  "recommendations": ["..."],
  "confidence": 0.72,
  "sources": [{"type": "clause", "id": 0, "text": "..."}]
}
```

The `SecurityAgent` additionally includes a `threat_model` field.

---

## CI

The GitHub Actions workflow (`.github/workflows/decision-engine-ci.yml`) runs linting and tests with `DISHA_MODEL_PROVIDER=mock` on every push/PR that touches `decision-engine/`.
