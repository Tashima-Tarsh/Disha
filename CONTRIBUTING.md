### Prerequisites

- **Bun** 1.1+ (CLI runtime)
- **Node.js** 18+ (MCP server)
- **Python** 3.11+ (AI platform, decision engine, cyber defense)
- **Git**

### Setup

```bash
git clone https://github.com/Tashima-Tarsh/Disha.git
cd Disha
```

### MCP Server Development

```bash
cd mcp-server
npm install
npm run dev    # Run with tsx (no build step)
npm run build  # Compile to dist/
```

### Linting & Type Checking

```bash
# From the repo root — checks the src/
npm run lint        # Biome lint
npm run typecheck   # TypeScript type check
```

### Python Modules

```bash
# AI Platform
cd ai-platform/backend && pip install -r requirements.txt

# Decision Engine (mock mode — no LLM needed)
cd decision-engine && pip install -r requirements.txt
DISHA_MODEL_PROVIDER=mock python -m pytest tests/ -v

# Cyber Defense
cd cyber-defense && pip install torch --index-url https://download.pytorch.org/whl/cpu
```

## Code Style

For any new code (MCP server, tooling, scripts):

- TypeScript with strict mode
- ES modules
- 2-space indentation (tabs for `src/` to match Biome config)
- Descriptive variable names, minimal comments
- Python: PEP 8, max line length 120, flake8 for linting


## Questions?

Open an issue at https://github.com/Tashima-Tarsh/Disha/issues