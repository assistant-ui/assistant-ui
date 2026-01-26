# McpUiToolMeta

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

UI-related metadata for tools.

##### Index

### Properties

[resourceUri?](#resourceuri)
[visibility?](#visibility)

### `Optional`resourceUri[](#resourceuri)

resourceUri?: string
URI of the UI resource to display for this tool, if any.
This is converted to `_meta["ui/resourceUri"]`.

#### Example: "ui://weather/view.html"[](#example-uiweatherviewhtml)

- Defined in [src/spec.types.ts:626](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L626)

### `Optional`visibility[](#visibility)

visibility?: [McpUiToolVisibility](../types/app.McpUiToolVisibility.html)[]
#### Description[](#description-1)

Who can access this tool. Default: ["model", "app"]

- "model": Tool visible to and callable by the agent

- "app": Tool callable by the app from this server only

- Defined in [src/spec.types.ts:632](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L632)

