# Testing & QA

Ensuring the integrity of a sovereign intelligence platform requires a rigorous, multi-layered testing strategy.

## 🧪 Testing Layers

### 1. Unit Tests (Python)
We use `pytest` for all intelligence services.
```bash
# Run all backend tests
cd disha/services/ai-platform/backend
python -m pytest tests/ -v
```

### 2. Unit Tests (TypeScript)
We use the native `bun test` runner for CLI and web components.
```bash
bun test disha/legacy-root-src
```

### 3. Cognitive Integration Tests
Specialized tests that validate the **7-stage loop** logic by mocking AI responses and checking the accumulated `CognitiveState`.
- **Location**: `disha/ai/core/tests/`

### 4. Sentinel Security Tests
Simulated attacks and health-check failures to ensure the self-healing layer is functioning.
- **Location**: `disha/services/ai-platform/backend/tests/test_sentinel_agent.py`

---

## 📊 Continuous Integration (CI)

Our GitHub Actions workflows run on every push:
- **Linting**: Biome (TS) and Flake8 (Python).
- **Security**: CodeQL SAST scanning.
- **Coverage**: Pytest-cov ensures > 90% coverage on core logic.

---

## 🛠️ Writing New Tests

1.  **Mocks**: Always use `DISHA_MODEL_PROVIDER=mock` for AI tests to ensure determinism and cost-control.
2.  **Fixtures**: Use the shared fixtures in `conftest.py` for database and session initialization.
3.  **Naming**: Python files must start with `test_` and TS files must end with `.test.ts`.
