# @assistant-ui/openskybridge

Secure iframe rendering for OpenAI Apps SDK widgets.

## Installation

```bash
npm install @assistant-ui/openskybridge
```

## Usage

```tsx
import { OpenSkybridge, openaiSkybridge } from "@assistant-ui/openskybridge";

function MyWidget({ html }: { html: string }) {
  return (
    <OpenSkybridge
      runtime={openaiSkybridge()}
      payload={html}
      theme="dark"
      locale="en-US"
      toolInput={{ city: "Tokyo" }}
      onCallTool={async (name, args) => {
        // Handle tool calls from the widget
        return { content: { result: "success" } };
      }}
      onRequestClose={() => {
        // Handle close request
      }}
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `runtime` | `SkybridgeRuntime` | Runtime adapter (use `openaiSkybridge()`) |
| `payload` | `string` | HTML content to render in the sandboxed iframe |
| `theme` | `"light" \| "dark"` | Theme for the widget |
| `locale` | `string` | Locale string (e.g., "en-US") |
| `maxHeight` | `number` | Maximum height constraint |
| `displayMode` | `"pip" \| "inline" \| "fullscreen"` | Display mode |
| `toolInput` | `Record<string, unknown>` | Input data for the widget |
| `toolOutput` | `Record<string, unknown> \| null` | Output data from tool calls |
| `onCallTool` | `(name, args) => Promise<{ content: unknown }>` | Handler for tool calls |
| `onRequestClose` | `() => void` | Handler for close requests |
| `onSendFollowUpMessage` | `(args) => Promise<void>` | Handler for follow-up messages |
| `onOpenExternal` | `(payload) => void` | Handler for external link requests |
| `onRequestDisplayMode` | `(args) => Promise<{ mode }>` | Handler for display mode changes |
| `onSetWidgetState` | `(state) => Promise<void>` | Handler for widget state updates |

## Security

Widgets are rendered in a sandboxed iframe using [safe-content-frame](https://github.com/nicbarker/safe-content-frame), providing strong isolation:

- Each unique payload gets its own origin (cookie/storage isolation)
- Sandbox attributes limit iframe capabilities
- Communication happens through structured postMessage protocol
