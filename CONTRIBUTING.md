### Prerequisites

- **Node.js** 18+ (for the MCP server)
- **Git**

### Setup

```bash
git clone https://github.com/Monster/claude-code.git
cd claude-code
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
# From the repo root — checks the leaked src/
npm run lint        # Biome lint
npm run typecheck   # TypeScript type check
```

## Code Style

For any new code (MCP server, tooling, scripts):

- TypeScript with strict mode
- ES modules
- 2-space indentation (tabs for `src/` to match Biome config)
- Descriptive variable names, minimal comments


## Questions?


