import { getMcpClient, getMcpTools } from "../mcp-client";

export const maxDuration = 30;

const MCP_APP_MIME = "text/html;profile=mcp-app";

const findListedResource = async (
  client: Awaited<ReturnType<typeof getMcpClient>>,
  uri: string,
) => {
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  try {
    while (true) {
      const result = await client.listResources(
        cursor ? { params: { cursor } } : undefined,
      );
      const match = (
        result as { resources?: Array<Record<string, unknown>> }
      ).resources?.find((resource) => resource.uri === uri);
      if (match) return match;
      const nextCursor = (result as { nextCursor?: unknown }).nextCursor;
      if (
        typeof nextCursor !== "string" ||
        nextCursor === "" ||
        seenCursors.has(nextCursor)
      ) {
        return undefined;
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
  } catch {
    return undefined;
  }
};

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
        const readMeta = (match?.["_meta"] as Record<string, unknown>)?.["ui"];
        const listed = readMeta
          ? undefined
          : await findListedResource(client, params.uri);
        const listedMeta = (listed?.["_meta"] as Record<string, unknown>)?.[
          "ui"
        ];
        return Response.json({
          uri: params.uri,
          mimeType: MCP_APP_MIME,
          html: typeof match?.["text"] === "string" ? match["text"] : "",
          meta: readMeta ?? listedMeta,
        });
      }
      case "tools/call": {
        if (typeof params.name !== "string") {
          return Response.json({ error: "Missing tool name" }, { status: 400 });
        }
        const tools = await getMcpTools();
        const tool = tools[params.name];
        if (!tool?.execute) {
          return Response.json(
            { error: `Tool '${params.name}' is not callable` },
            { status: 400 },
          );
        }
        const result = await tool.execute(
          (params.arguments ?? {}) as Record<string, unknown>,
          {
            toolCallId: `mcp-apps-bridge-${crypto.randomUUID()}`,
            messages: [],
            context: undefined,
          },
        );
        return Response.json(result);
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
