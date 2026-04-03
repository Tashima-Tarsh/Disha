# AG-Claw Source Explorer MCP

This MCP server exposes the repository's reference `src/` tree for research and migration work. It is for source inspection and code archaeology, not for running clean-room product logic.

It supports `stdio`, Streamable HTTP, and legacy SSE transports.

## What It Exposes

- tools for listing commands and tools, reading source files, searching, and summarizing architecture
- resources under `agclaw-reference://...`
- prompt templates for deeper code archaeology

## Quick Start

```bash
cd mcp-server
npm install
npm run build
AGCLAW_REFERENCE_SRC_ROOT=/path/to/repo/src node dist/src/index.js
```

Legacy `CLAUDE_CODE_SRC_ROOT` is still accepted for compatibility, but new setups should use `AGCLAW_REFERENCE_SRC_ROOT`.

## HTTP Mode

```bash
AGCLAW_REFERENCE_SRC_ROOT=/path/to/repo/src npm run start:http
```

Optional auth:

```bash
AGCLAW_REFERENCE_SRC_ROOT=/path/to/repo/src MCP_API_KEY=your-secret-token npm run start:http
```

## Example VS Code MCP Config

```json
{
  "servers": {
    "agclaw-source-explorer": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/dist/src/index.js"],
      "env": {
        "AGCLAW_REFERENCE_SRC_ROOT": "${workspaceFolder}/src"
      }
    }
  }
}
```

## Key Tools

- `list_tools`
- `list_commands`
- `get_tool_source`
- `get_command_source`
- `read_source_file`
- `search_source`
- `list_directory`
- `get_architecture`

## Resource URIs

- `agclaw-reference://architecture`
- `agclaw-reference://tools`
- `agclaw-reference://commands`
- `agclaw-reference://source/{path}`

## Example Prompts

- "List all reference tools"
- "Show me the BashTool implementation"
- "Search for how permissions are checked"
- "Explain how the bridge subsystem works"
- "Compare FileReadTool and FileEditTool"

## Environment Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `AGCLAW_REFERENCE_SRC_ROOT` | `../src` relative to `dist/` | Path to the reference `src/` directory |
| `CLAUDE_CODE_SRC_ROOT` | none | Legacy compatibility alias |
| `PORT` | `3000` | HTTP server port |
| `MCP_API_KEY` | none | Optional bearer token for HTTP auth |

## Development

```bash
npm install
npm run dev
npm run build
npm start
npm run start:http
```

## Architecture

```text
mcp-server/
|-- src/
|   |-- server.ts    - Shared MCP server (tools, resources, prompts); transport-agnostic
|   |-- index.ts     - STDIO entrypoint (local)
|   `-- http.ts      - HTTP + SSE entrypoint (remote)
|-- api/
|   |-- index.ts     - Vercel serverless function
|   `-- vercelApp.ts - Express app for Vercel
|-- Dockerfile       - Docker build (Railway, Fly.io, etc.)
|-- railway.json     - Railway deployment config
|-- package.json
`-- tsconfig.json
```
