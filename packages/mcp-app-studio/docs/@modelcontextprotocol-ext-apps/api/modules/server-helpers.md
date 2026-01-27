# server-helpers

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

Utilities for MCP servers to register tools and resources that display interactive UIs.

Use these helpers instead of the base SDK's `registerTool` and `registerResource` when
your tool should render an [`App`](../classes/app.App.html) in the client. They handle UI metadata normalization
and provide sensible defaults for the MCP Apps MIME type ([`RESOURCE_MIME_TYPE`](../variables/app.RESOURCE_MIME_TYPE.html)).

#### Example[](#example)

```
`// Register a tool that displays a view
registerAppTool(
  server,
  "weather",
  {
    description: "Get weather forecast",
    _meta: { ui: { resourceUri: "ui://weather/view.html" } },
  },
  toolCallback,
);

// Register the HTML resource the tool references
registerAppResource(
  server,
  "Weather View",
  "ui://weather/view.html",
  {},
  readCallback,
);
`Copy
```

