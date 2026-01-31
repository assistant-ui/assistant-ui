# @assistant-ui/tool-ui-runtime

A framework-agnostic runtime for rendering Tool UIs in assistant-ui. Enables rich, interactive tool call visualizations with support for React components, sandboxed HTML, and lifecycle management.

## Features

- **Multiple Output Types**: Render tools as React components, sandboxed HTML, or external URLs
- **Lifecycle Management**: Full control over tool UI states (created → mounting → active → updating → closing → closed)
- **Secure HTML Sandboxing**: Safely render untrusted HTML content in isolated iframes
- **Streaming Updates**: Support for real-time updates as tool results stream in
- **Framework Agnostic Core**: Core runtime works without React; React integration provided separately

## Quick Start

### 1. Create a Registry

```tsx
import { ToolUIRegistryImpl } from "@assistant-ui/tool-ui-runtime";
import type { ToolUIFactoryProps } from "@assistant-ui/tool-ui-runtime";

const registry = new ToolUIRegistryImpl();

// Register a tool UI
registry.register({
  toolName: "get_weather",
  factory: (props: ToolUIFactoryProps) => {
    const { context, lifecycle, result } = props;
    const location = (context.args as any)?.location || "Unknown";

    // Loading state
    if (!result || lifecycle === "mounting") {
      return {
        kind: "html",
        html: `<div>Loading weather for ${location}...</div>`,
      };
    }

    // Result state - render React component
    return {
      kind: "react",
      element: <WeatherWidget data={result} />,
    };
  },
});
```

### 2. Create the Runtime

```tsx
import { 
  ToolUIRuntimeImpl, 
  SafeContentFrameSandbox 
} from "@assistant-ui/tool-ui-runtime";

const runtime = new ToolUIRuntimeImpl({
  registry,
  createSandbox: () => new SafeContentFrameSandbox(),
});
```

### 3. Use with React (via @assistant-ui/react)

```tsx
import { ToolUIProvider, ToolUIInline } from "@assistant-ui/react";

function Assistant() {
  return (
    <ToolUIProvider runtime={runtime}>
      <Thread />
    </ToolUIProvider>
  );
}

// In your message component
function AssistantMessage() {
  const toolCallIds = /* extract from message */;
  return (
    <div>
      <MessageContent />
      <ToolUIInline toolCallIds={toolCallIds} />
    </div>
  );
}
```

## API Reference

### ToolUIFactoryProps

Props passed to your factory function:

```typescript
type ToolUIFactoryProps = {
  id: string;                    // Unique instance ID
  context: {
    toolCallId: string;          // Tool call ID from the message
    toolName: string;            // Name of the tool
    args: unknown;               // Arguments passed to the tool
  };
  lifecycle: ToolUILifecycleState;  // Current lifecycle state
  result?: unknown;              // Tool result (when available)
};
```

### ToolUIRenderOutput

Return type from your factory:

```typescript
// React component
{ kind: "react"; element: ReactNode }

// Sandboxed HTML
{ kind: "html"; html: string; height?: number }

// External URL in iframe
{ kind: "url"; url: string; height?: number }

// Render nothing
{ kind: "empty" }
```

### Lifecycle States

```
created → resolved → mounting → active → updating → closing → closed
```

- **created**: Instance created, not yet resolved
- **mounting**: Factory called, preparing to render
- **active**: Rendered and visible
- **updating**: New result received, re-rendering
- **closing/closed**: Being cleaned up

## When to Use Tool UI Runtime

Use Tool UI Runtime instead of `makeAssistantToolUI` when you need:

| Feature | makeAssistantToolUI | Tool UI Runtime |
|---------|---------------------|-----------------|
| Simple React UIs | YES | YES |
| Sandboxed HTML | NO | YES |
| Server-streamed updates | NO | YES |
| Lifecycle hooks | NO | YES |
| MCP server integration | NO | YES |
| Untrusted content | NO | YES |

## Examples

See the `examples/with-tool-ui` directory for a complete example with:
- Weather widget with animated effects
- Live stock ticker with real-time price updates
- Crypto dashboard with multiple updating prices

## License

MIT