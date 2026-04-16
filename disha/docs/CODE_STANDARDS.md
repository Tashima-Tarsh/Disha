# Code Standards & Quality

DISHA is built to mission-critical standards. We prioritize readability, maintainability, and security over cleverness.

## 🛠️ Tooling

All code must pass through our automated linting and formatting pipeline:
- **TypeScript**: [Biome](https://biomejs.dev)
- **Python**: [Flake8](https://flake8.pycqa.org) + [Black](https://black.readthedocs.io)

---

## 🐍 Python Standards

1.  **Type Hinting**: All functions must have type hints for parameters and return values.
2.  **Docstrings**: Use the Google style docstring format.
3.  **Naming**: Use `snake_case` for variables/functions and `PascalCase` for classes.
4.  **Async**: Prioritize `async/await` for any I/O bound operations.

```python
async def analyze_signal(signal: str, confidence: float = 0.5) -> dict:
    """
    Brief description of the function.

    Args:
        signal: The raw signal string.
        confidence: Minimum confidence threshold.

    Returns:
        Structured analysis report.
    """
    pass
```

---

## 📦 TypeScript Standards

1.  **Strict Mode**: `strict: true` must remain enabled in `tsconfig.json`.
2.  **No Any**: Use `unknown` or specific interfaces instead of `any`.
3.  **Functional React**: Prefer functional components and hooks over class components.
4.  **Immutability**: Avoid mutating state directly; use the spread operator or functional updates.

---

## 🏛️ General Engineering Principles

- **Small PRs**: Limit pull requests to a single feature or fix.
- **Atomic Commits**: Each commit should represent a single logical change.
- **Test Coverage**: New features must include unit and/or integration tests.
- **Documentation**: Any change to public APIs or significant modules must be updated in `/docs`.
