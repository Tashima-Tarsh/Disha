# Disha Agent Core

**Autonomous Claude-powered coding agent system** — a modular, scalable architecture for intelligent code analysis, planning, and execution.

## Architecture

```
agent-core/
├── agent.py       # Main orchestrator — ties all modules together
├── planner.py     # Task decomposition using Claude (with rule-based fallback)
├── executor.py    # Tool-based task execution engine
├── memory.py      # Context, logs, and decision storage
├── tools.py       # File system, terminal, search, and analysis tools
├── controller.py  # Autonomous improvement loop
├── config.py      # Environment-based configuration
├── types.py       # Shared type definitions
└── tests/         # Comprehensive test suite
```

## Modules

### 🧠 Planner (`planner.py`)
Decomposes high-level objectives into structured, dependency-aware task plans.
- Claude-powered intelligent decomposition
- Rule-based fallback when API is unavailable
- Dependency-aware task ordering
- Adaptive replanning on failure

### ⚡ Executor (`executor.py`)
Translates tasks into tool calls and executes them.
- Claude-powered tool selection
- Heuristic fallback for tool resolution
- Sequential tool chain execution
- Result summarization

### 💾 Memory (`memory.py`)
Scoped, persistent memory store for context and decisions.
- Session / Project / Global scopes
- Tag-based search
- Decision audit trail
- Automatic eviction (LRU by access count)
- JSON persistence

### 🔧 Tools (`tools.py`)
Safe, sandboxed access to the environment.
- `read_file` / `write_file` — file I/O with sandbox controls
- `list_directory` / `search_files` — navigation
- `grep` — content search
- `run_command` — shell execution with blocklist
- `analyze_structure` — directory tree analysis
- Extensible registry for custom tools

### 🔄 Controller (`controller.py`)
Autonomous loop: Plan → Execute → Evaluate → Iterate.
- Configurable cycle limits
- Consecutive failure detection
- Automatic replanning
- Lifecycle hooks for monitoring

### ⚙️ Config (`config.py`)
Zero-dependency configuration from environment variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Claude API key |
| `DISHA_CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Model name |
| `DISHA_MAX_TOKENS` | `4096` | Max response tokens |
| `DISHA_TEMPERATURE` | `0.3` | Sampling temperature |
| `DISHA_MAX_CYCLES` | `50` | Max controller cycles |
| `DISHA_SANDBOX` | `true` | Sandbox mode for file writes |
| `DISHA_DRY_RUN` | `false` | Plan only, don't execute |
| `DISHA_LOG_LEVEL` | `info` | Logging level |

## Quick Start

```python
from agent_core import Agent, AgentConfig

# Initialize with env vars
config = AgentConfig.from_env()
agent = Agent(config)

# Run autonomously
state = agent.run("Refactor the authentication module for clarity")
print(f"Completed {state.cycle} cycles, progress: {state.active_plan.progress:.0%}")

# Or plan first, then iterate
plan = agent.plan("Add input validation to API endpoints")
for task in agent.iterate(plan):
    print(f"  {task.title}: {task.status.value}")

# Direct tool access
result = agent.tool("read_file", path="src/main.py")
print(result.output[:200])

# Memory
agent.remember("api_pattern", "REST with versioned endpoints")
print(agent.recall("api_pattern"))
```

## Testing

```bash
# From the repository root:
pip install pytest
python -m pytest agent_core/tests/ -v
```

The test conftest automatically creates an `agent_core` symlink at the repo root
for Python import resolution. This symlink is gitignored. Tests must be run from
the repo root using the `agent_core/` path (not `agent-core/`).

## Design Principles

1. **Zero required dependencies** — core runs on Python stdlib alone
2. **Graceful degradation** — works without Claude API (rule-based fallback)
3. **Extensible** — register custom tools, lifecycle hooks
4. **Safe** — sandbox mode, command blocklist, extension allowlist
5. **Observable** — structured logs, decision audit trail, memory snapshots
