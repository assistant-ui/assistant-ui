import type { Experimental_StdioMCPTransport as NodeStdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";

class UnsupportedStdioMCPTransport {
  constructor() {
    throw new Error(
      "stdio MCP transport requires a runtime that can spawn a subprocess, such as Node, Bun, or Deno (with --allow-run). Use an HTTP or SSE MCP server config in browser, React Native, edge, or worker runtimes.",
    );
  }
}

export const Experimental_StdioMCPTransport =
  UnsupportedStdioMCPTransport as unknown as typeof NodeStdioMCPTransport;
