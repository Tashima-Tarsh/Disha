import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, SRC_ROOT } from "./server.js";

/**
 * STDIO entrypoint — for local use with DISHA Command Dashboard or other MCP clients.
 */

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
    console.error(`DISHA Intelligence Explorer MCP (stdio) started — root: ${SRC_ROOT}`);
  } catch (error) {
    console.error("Error starting DISHA MCP server:", error);
    process.exit(1);
  }
}

main();
