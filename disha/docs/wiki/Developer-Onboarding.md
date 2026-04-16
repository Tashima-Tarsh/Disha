# Developer Onboarding & Contribution

Welcome to the DISHA contribution community. We are building the future of sovereign intelligence.

## 🛠️ Environment Prerequisites

- **Bun v1.2.0+**
- **Python v3.12.0+**
- **Docker & Docker Compose**
- **NVIDIA GPU Drivers** (Optional, for Physics/GNN)

## 🚀 Quick Start Setup

1.  **Clone the Monorepo**: `git clone https://github.com/Tashima-Tarsh/Disha.git`
2.  **Install Global Deps**: `bun install`
3.  **Launch Infrastructure**: `cd disha/infra/docker && docker compose up -d`
4.  **Backend Services**: Create a virtualenv in `disha/services/ai-platform/backend` and `pip install -r requirements.txt`.

---

## 🏛️ Engineering Principles

- **Zero-Dependency Core**: Wherever possible, use local/local-hostable alternatives over external SaaS tools.
- **Strict Typing**: TypeScript (Strict) and Python Type-Hinting are mandatory.
- **Asynchronous Priority**: All microservice communication and AI loops must follow async/await patterns.
- **Atomic Commits**: Keep your pull requests focused on a single logical change.

---

## 🤝 Contribution Workflow

1.  **Fork** the repository and create a feature branch.
2.  **Lint & Test** locally: `bun run check`.
3.  **Document** any new services or agents in a corresponding `.md` file in `disha/docs/`.
4.  **Submit PR** with a clear explanation of the architectural impact.

---

## 🆘 Support & Discussion

- **Issues**: For bug reports and feature requests.
- **Security**: See [SECURITY.md](../SECURITY.md) for vulnerability disclosure.
- **Walkthrough**: [Repository Walkthrough](../../REPO_WALKTHROUGH.md) for deep-dives into the folder logic.
