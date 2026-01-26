# @modelcontextprotocol/ext-apps/react

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

React utilities for building MCP Apps.

This module provides React hooks and utilities for easily building
interactive MCP Apps using React. This is optional - the core SDK
([`App`](../classes/app.App.html), [`PostMessageTransport`](../classes/message-transport.PostMessageTransport.html)) is framework-agnostic and can be
used with any UI framework or vanilla JavaScript.

## Main Exports[](#main-exports)

- [`useApp`](../functions/_modelcontextprotocol_ext-apps_react.useApp.html) - React hook to create and connect an MCP App

- [`useHostStyleVariables`](../functions/_modelcontextprotocol_ext-apps_react.useHostStyleVariables.html) - React hook to apply host style variables and theme

- [`useHostFonts`](../functions/_modelcontextprotocol_ext-apps_react.useHostFonts.html) - React hook to apply host fonts

- [`useDocumentTheme`](../functions/_modelcontextprotocol_ext-apps_react.useDocumentTheme.html) - React hook for reactive document theme

- [`useAutoResize`](../functions/_modelcontextprotocol_ext-apps_react.useAutoResize.html) - React hook for manual auto-resize control (rarely needed)

#### Example: Basic React App[](#example-basic-react-app)

```
`function MyApp() {
  const { app, isConnected, error } = useApp({
    appInfo: { name: "MyApp", version: "1.0.0" },
    capabilities: {},
  });

  if (error) return <div>Error: {error.message}</div>;
  if (!isConnected) return <div>Connecting...</div>;

  return <div>Connected!</div>;
}
`Copy
```

