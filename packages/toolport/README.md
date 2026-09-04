# toolport

Define a toolkit once. Serve it as a CLI, an MCP server, or WebMCP. Zero dependencies.

```ts
import { defineToolkit, tool } from "toolport";

export const weather = defineToolkit({
  name: "weather",
  description: "Weather lookups.",
  tools: {
    getWeather: tool({
      description: "Get the current weather for a location.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name." },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
        },
        required: ["location"],
      },
      execute: async ({ location, unit }: { location: string; unit?: string }) =>
        fetchWeather(location, unit ?? "celsius"),
    }),
  },
});
```

Parameters are plain JSON Schema, so any schema library that emits it works (`z.toJSONSchema(schema)` for zod).

## CLI

```ts
#!/usr/bin/env node
import { serveCli } from "toolport/cli";
import { weather } from "./weather";

serveCli(weather);
```

```sh
weather                                   # usage and tool list
weather list                              # tools as JSON
weather getWeather --help                 # flags derived from the schema
weather getWeather --location Berlin --unit fahrenheit
weather getWeather --json '{"location":"Berlin"}'
```

Flags are coerced by schema type; results print as JSON, errors go to stderr with exit code 1.

## MCP

Stdio, for local agent hosts:

```ts
import { serveMcpStdio } from "toolport/mcp";
import { weather } from "./weather";

serveMcpStdio(weather);
```

HTTP, as a fetch handler for any framework:

```ts
import { createMcpFetchHandler } from "toolport/mcp";
import { weather } from "./weather";

export const POST = createMcpFetchHandler(weather);
```

Implements `initialize`, `ping`, `tools/list`, and `tools/call`. Tool failures come back as `isError` results; unknown tools are JSON-RPC invalid-params errors.

## WebMCP

```ts
import { registerWebMcp } from "toolport/webmcp";
import { weather } from "./weather";

const unregister = registerWebMcp(weather);
```

Registers every tool with `navigator.modelContext` and is a no-op in browsers without it.

## Programmatic

```ts
import { listTools, callTool } from "toolport";

listTools(weather); // [{ name, description, inputSchema }]
await callTool(weather, "getWeather", { location: "Berlin" });
```

`callTool` validates required keys, top-level types, and enums before executing, and throws a `ToolError` with a `code` of `unknown_tool`, `invalid_args`, or `execution_failed`.
