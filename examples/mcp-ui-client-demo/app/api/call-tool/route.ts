import { createNativeMCPClient } from "@/lib/mcp-client-native";

export async function POST(req: Request) {
  const { name, args }: { name: string; args: Record<string, unknown> } =
    await req.json();

  let mcpClient: Awaited<ReturnType<typeof createNativeMCPClient>> | null =
    null;

  try {
    mcpClient = await createNativeMCPClient();
    const tools = mcpClient.tools();
    const tool = tools[name];

    if (!tool) {
      await mcpClient.close();
      return Response.json(
        { error: `Tool '${name}' not found` },
        { status: 404 },
      );
    }

    const result = await tool.execute(args, {});
    await mcpClient.close();

    return Response.json({ content: result });
  } catch (error) {
    await mcpClient?.close();
    console.error(`[call-tool] Error calling ${name}:`, error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Tool execution failed",
      },
      { status: 500 },
    );
  }
}
