import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, SRC_ROOT } from "./server.js";

/**
 * HTTP / SSE entrypoint — for remote use.
 * 
 * Environment variables:
 *   PORT            — Port to listen on (default: 3000)
 *   DISHA_SRC_ROOT  — Path to DISHA monorepo root
 *   MCP_API_KEY     — Bearer token for authentication (optional)
 */

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.MCP_API_KEY;

const mcpServer = createServer();
let sseTransport: SSEServerTransport | null = null;

// Auth middleware
const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!API_KEY) return next();
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${API_KEY}`) return next();
  res.status(401).json({ error: "Unauthorized" });
};

// SSE transport setup
app.get("/sse", auth, async (req, res) => {
  sseTransport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(sseTransport);
});

// Messages endpoint (for SSE)
app.post("/messages", auth, express.json(), async (req, res) => {
  if (sseTransport) {
    await sseTransport.handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: "No active SSE connection" });
  }
});

// Streamable HTTP endpoint (for modern clients)
app.post("/mcp", auth, express.json(), async (req, res) => {
  // Simple HTTP transport wrapper
  res.status(501).json({ error: "Streamable HTTP not fully implemented in this wrapper yet. Use /sse instead." });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", root: SRC_ROOT });
});

app.listen(PORT, () => {
  console.log(`DISHA Intelligence Explorer MCP (HTTP) listening on port ${PORT}`);
  console.log(`Source root: ${SRC_ROOT}`);
});
