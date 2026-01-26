# registerAppTool

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

- registerAppTool<
    [OutputArgs](#registerapptooloutputargs) extends AnySchema
    | ZodRawShapeCompat,
    [InputArgs](#registerapptoolinputargs) extends AnySchema | ZodRawShapeCompat | undefined = undefined,
>(
    server: Pick<McpServer, "registerTool">,
    name: string,
    config: [McpUiAppToolConfig](../interfaces/server-helpers.McpUiAppToolConfig.html) & {
        inputSchema?: [InputArgs](#registerapptoolinputargs);
        outputSchema?: [OutputArgs](#registerapptooloutputargs);
    },
    cb: [ToolCallback](../types/server-helpers.ToolCallback.html)<[InputArgs](#registerapptoolinputargs)>,
): RegisteredTool[](#registerapptool)
Register an app tool with the MCP server.

This is a convenience wrapper around `server.registerTool` that normalizes
UI metadata: if `_meta.ui.resourceUri` is set, the legacy `_meta["ui/resourceUri"]`
key is also populated (and vice versa) for compatibility with older hosts.

#### Type Parameters

OutputArgs extends AnySchema | ZodRawShapeCompat
- InputArgs extends AnySchema | ZodRawShapeCompat | undefined = undefined

