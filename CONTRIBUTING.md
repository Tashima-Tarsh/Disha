# Contributing to DISHA v5.0.0

First off, thank you for considering contributing to DISHA! It's people like you that make DISHA an elite tool for the AGI community.

## 🌟 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## 🚀 Getting Started

### Prerequisites
- **Bun** ≥ 1.1.0 (Primary runtime)
- **Python** ≥ 3.13 (AI & ML modules)
- **Node.js** ≥ 20 (Compatibility)
- **Docker** (For full ecosystem testing)

### Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/Tashima-Tarsh/Disha.git`
3. Install dependencies: `bun install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## 🛠️ Development Workflow

### CLI Core (TypeScript)
The core engine is located in `src/`. We use **Biome** for linting and formatting.
```bash
bun run lint      # Check for issues
bun run format    # Auto-format code
bun run build     # Build the CLI bundle
```

### AI Platforms (Python)
Each platform has its own `requirements.txt`.
```bash
# Example: AI Platform
cd ai-platform/backend
pip install -r requirements.txt
python -m pytest tests/
```

## 📐 Coding Standards

- **TypeScript:** Strict mode, ES Modules, descriptive naming.
- **Python:** PEP 8, 120 char line limit, docstrings for all public classes/methods.
- **CSS:** Tailwind CSS utility-first approach with semantic HSL tokens.

## 📬 Pull Request Process

1. Ensure your code passes all linting and tests.
2. Update the README or documentation if you've added new features.
3. Submit the PR with a clear description of the "What" and the "Why".
4. One of the maintainers (Tashima Tarsh) will review your PR within 48 hours.

## 💎 Reporting Bugs & Suggestions

Please use [GitHub Issues](https://github.com/Tashima-Tarsh/Disha/issues) to report bugs or suggest new features. For security-related reports, please see our [Security Policy](./SECURITY.md).

---

<sub>Dedicated to the evolution of digital thought.</sub>