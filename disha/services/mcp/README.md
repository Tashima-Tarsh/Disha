# DISHA Intelligence Explorer — MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that enables any MCP-compatible client to explore the DISHA Sovereign Intelligence codebase. Supports **STDIO**, **Streamable HTTP**, and **SSE** transports.

## What It Does

Exposes 8 tools, 3 resources, and 5 prompts for navigating the DISHA monorepo architecture. This is the official explorer for the `@tashima-tarsh/disha` ecosystem.

### Transports

| Transport | Endpoint | Best For |
|-----------|----------|----------|
| **STDIO** | `node dist/index.js` | Local agents, VS Code, Cursor |
| **Streamable HTTP** | `POST/GET /mcp` | Modern MCP clients, remote hosting |
| **Legacy SSE** | `GET /sse` + `POST /messages` | Web-based MCP clients |

### Tools

| Tool | Description |
|------|-------------|
| `list_tools` | List all 40+ DISHA agents and core tools |
| `list_commands` | List all 50+ sovereign slash commands |
| `get_tool_source` | Read a specific tool's implementation |
| `get_command_source` | Read a specific command's implementation |
| `read_source_file` | Read any file from the `disha/` monorepo |
| `search_source` | Regex search across the entire DISHA tree |
| `list_directory` | List contents of any directory within the monorepo |
| `get_architecture` | Get a full architecture overview of DISHA |

### Resources

| URI | Description |
|-----|-------------|
| `disha://architecture` | DISHA README / architecture overview |
| `disha://tools` | Tool registry (JSON) |
| `disha://commands` | Command registry (JSON) |
| `disha://source/{path}` | Any source file (template) |

### Prompts

| Prompt | Description |
|--------|-------------|
| `explain_tool` | Deep-dive explanation of a specific DISHA tool's purpose and schema |
| `explain_command` | Explanation of a specific sovereign slash command's behavior |
| `architecture_overview` | Guided tour of the full DISHA Monorepo architecture |
| `how_does_it_work` | Explain a feature/subsystem (Cognitive Loop, Sentinel, etc.) |
| `compare_tools` | Side-by-side comparison of two DISHA tools |

## Setup

```bash
cd disha/services/mcp
npm install
npm run build
```

### Run Locally (STDIO)

```bash
npm start
# or with custom source path:
DISHA_SRC_ROOT=/path/to/disha npm start
```

### Run Locally (HTTP)

```bash
npm run start:http
# Streamable HTTP at http://localhost:3000/mcp
# Legacy SSE at http://localhost:3000/sse
# Health check at http://localhost:3000/health
```

### With Authentication

```bash
MCP_API_KEY=your-secret-token npm run start:http
# Clients must include: Authorization: Bearer your-secret-token
```

## Configuration

### Example Agent Configuration

Add to your MCP-compatible agent's configuration:

```json
{
  "mcpServers": {
    "disha-explorer": {
      "command": "node",
      "args": ["/absolute/path/to/disha/services/mcp/dist/index.js"],
      "env": {
        "DISHA_SRC_ROOT": "/absolute/path/to/disha"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISHA_SRC_ROOT` | `../../` (relative to dist/) | Path to the DISHA monorepo root |
| `PORT` | `3000` | HTTP server port (HTTP mode only) |
| `MCP_API_KEY` | _(none)_ | Bearer token for HTTP auth (optional) |

## Remote HTTP Client Configuration

For clients connecting to a remote server:

```json
{
  "mcpServers": {
    "disha-explorer": {
      "url": "https://your-deployment.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer your-secret-key"
      }
    }
  }
}
```

## Deployment

### Docker

```bash
# From monorepo root
docker build -f disha/services/mcp/Dockerfile -t disha-mcp .
docker run -p 3000:3000 -e MCP_API_KEY=your-secret disha-mcp
```

## Example Usage

Once connected, you can ask your AI assistant things like:

- "List all DISHA core tools"
- "Show me the CognitiveLoop implementation"
- "Search for how Sentinel handles restarts"
- "What files are in the disha/ai directory?"
- "Read the architecture.md file"
- "How does the 7-stage cognitive loop work?"

## Development

```bash
npm install
npm run dev    # Watch mode TypeScript compilation
npm run build  # Compile TypeScript to dist/
npm start      # Run STDIO server
npm run start:http  # Run HTTP server
```

## Architecture

```
mcp-server/
├── src/
│   ├── server.ts    — Shared MCP server (tools, resources, prompts)
│   ├── index.ts     — STDIO entrypoint
│   └── http.ts      — HTTP + SSE entrypoint
├── Dockerfile       — Docker build
├── railway.json     — Railway deployment config
├── package.json
└── tsconfig.json
```
