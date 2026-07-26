import { NextResponse } from "next/server";
import { buildXuluxMcpCatalog } from "@/lib/xulux/mcp-catalog";

// Public, anonymous catalog endpoint for external MCP agents.
// Intentionally NOT gated by the Xulux playground feature flag: the MCP
// server package consumes this endpoint from outside the docs app.
export function GET(req: Request) {
  const origin = new URL(req.url).origin;

  return NextResponse.json(buildXuluxMcpCatalog(origin), {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
    },
  });
}
