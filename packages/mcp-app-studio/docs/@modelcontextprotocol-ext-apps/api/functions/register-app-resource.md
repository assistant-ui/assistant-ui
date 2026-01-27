# registerAppResource

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

- registerAppResource(
    server: Pick<McpServer, "registerResource">,
    name: string,
    uri: string,
    config: [McpUiAppResourceConfig](../interfaces/server-helpers.McpUiAppResourceConfig.html),
    readCallback: [ReadResourceCallback](../types/server-helpers.ReadResourceCallback.html),
): void[](#registerappresource)
Register an app resource with the MCP server.

This is a convenience wrapper around `server.registerResource` that:

Defaults the MIME type to [`RESOURCE_MIME_TYPE`](../variables/app.RESOURCE_MIME_TYPE.html) (`"text/html;profile=mcp-app"`)

- Provides a cleaner API matching the SDK's callback signature

#### Parameters

- server: Pick<McpServer, "registerResource">The MCP server instance

- name: stringHuman-readable resource name

- uri: stringResource URI (should match the `_meta.ui` field in tool config)

- config: [McpUiAppResourceConfig](../interfaces/server-helpers.McpUiAppResourceConfig.html)Resource configuration

- readCallback: [ReadResourceCallback](../types/server-helpers.ReadResourceCallback.html)Callback that returns the resource contents

#### Returns void

#### Example: Basic usage[](#example-basic-usage)

```
`registerAppResource(
  server,
  "Weather View",
  "ui://weather/view.html",
  {
    description: "Interactive weather display",
  },
  async () => ({
    contents: [
      {
        uri: "ui://weather/view.html",
        mimeType: RESOURCE_MIME_TYPE,
        text: await fs.readFile("dist/view.html", "utf-8"),
      },
    ],
  }),
);
`Copy
```

#### Example: With CSP configuration for external domains[](#example-with-csp-configuration-for-external-domains)

```
`registerAppResource(
  server,
  "Music Player",
  "ui://music/player.html",
  {
    description: "Audio player with external soundfonts",
  },
  async () => ({
    contents: [
      {
        uri: "ui://music/player.html",
        mimeType: RESOURCE_MIME_TYPE,
        text: musicPlayerHtml,
        _meta: {
          ui: {
            csp: {
              resourceDomains: ["https://cdn.example.com"], // For scripts/styles/images
              connectDomains: ["https://api.example.com"], // For fetch/WebSocket
            },
          },
        },
      },
    ],
  }),
);
`Copy
```

#### See[](#see)

[`registerAppTool`](server-helpers.registerAppTool.html) to register tools that reference this resource

- Defined in [src/server/index.ts:302](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/server/index.ts#L302)

