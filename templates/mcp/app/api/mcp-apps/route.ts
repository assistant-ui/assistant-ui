import { getMcpClient } from "../mcp-client";

export const maxDuration = 30;

const MCP_APP_MIME = "text/html;profile=mcp-app";

export async function POST(req: Request) {
  let body: { method?: unknown; params?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const method = body.method;
  const params = (body.params ?? {}) as Record<string, unknown>;
  if (typeof method !== "string") {
    return Response.json({ error: "Missing method" }, { status: 400 });
  }

  const client = await getMcpClient();

  try {
    switch (method) {
      case "mcp-apps/read-resource": {
        if (typeof params.uri !== "string") {
          return Response.json({ error: "Missing uri" }, { status: 400 });
        }
        const result = await client.readResource({ uri: params.uri });
        const contents = (result as { contents?: unknown }).contents;
        const match = Array.isArray(contents)
          ? (contents as Array<Record<string, unknown>>).find(
              (c) => c.uri === params.uri,
            )
          : undefined;
        return Response.json({
          uri: params.uri,
          mimeType: MCP_APP_MIME,
          html: typeof match?.["text"] === "string" ? match["text"] : "",
        });
      }
      case "tools/call": {
        if (typeof params.name !== "string") {
          return Response.json({ error: "Missing tool name" }, { status: 400 });
        }
        const lowLevel = client as unknown as {
          callTool: (args: {
            name: string;
            args: Record<string, unknown>;
          }) => Promise<unknown>;
        };
        return Response.json(
          await lowLevel.callTool({
            name: params.name,
            args: (params.arguments ?? {}) as Record<string, unknown>,
          }),
        );
      }
      case "resources/read": {
        if (typeof params.uri !== "string") {
          return Response.json({ error: "Missing uri" }, { status: 400 });
        }
        return Response.json(await client.readResource({ uri: params.uri }));
      }
      case "resources/list": {
        return Response.json(await client.listResources());
      }
      default:
        return Response.json({ error: "Unsupported method" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message }, { status: 500 });
  }
}
