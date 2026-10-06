<a href="https://www.assistant-ui.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/header-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset=".github/assets/header-light.png" />
    <img src=".github/assets/header-light.png" alt="assistant-ui: the frontend library for AI agents" width="100%" />
  </picture>
</a>

<p align="center">
  <a href="https://www.assistant-ui.com">Product</a> ·
  <a href="https://www.assistant-ui.com/docs">Documentation</a> ·
  <a href="https://www.assistant-ui.com/examples">Examples</a> ·
  <a href="https://discord.gg/S9dwgCNEFs">Discord</a> ·
  <a href="https://cal.com/simon-farshid/assistant-ui">Contact Sales</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@assistant-ui/react"><img src="https://img.shields.io/npm/v/@assistant-ui/react" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@assistant-ui/react"><img src="https://img.shields.io/npm/dm/@assistant-ui/react" alt="npm downloads"></a>
  <a href="https://deepwiki.com/assistant-ui/assistant-ui"><img src="https://img.shields.io/badge/Ask-DeepWiki-1f6feb" alt="Ask DeepWiki"></a>
  <a href="https://app.workweave.ai/reports/repository/org_GhSIrtWo37b5B3Mv0At3wQ1Q/722184017"><img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fapp.workweave.ai%2Fapi%2Frepository%2Fbadge%2Forg_GhSIrtWo37b5B3Mv0At3wQ1Q%2F722184017&amp;cacheSeconds=3600" alt="Weave Badge"></a>
  <img src="https://img.shields.io/github/license/assistant-ui/assistant-ui" alt="GitHub License">
  <a href="https://github.com/assistant-ui/assistant-ui"><img src="https://img.shields.io/github/stars/assistant-ui/assistant-ui" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/Backed_by-Y_Combinator-orange" alt="Backed by Y Combinator">
</p>

## The UX of ChatGPT in your React app 💬🚀

**assistant-ui** is an open-source TypeScript/React library to build production-grade AI chat experiences fast.

<a href="https://www.assistant-ui.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/demo.webp" />
    <source media="(prefers-color-scheme: light)" srcset=".github/assets/demo-light.webp" />
    <img src=".github/assets/demo-light.webp" alt="An assistant-ui chat: a hotel search tool call, a streamed reply, an approval card that the user allows, and follow-up suggestions" width="100%" />
  </picture>
</a>

## Installation

The fastest path is the CLI, which scaffolds a Next.js app or adds the styled components to an existing project:

```bash
npx assistant-ui@latest create   # new project
npx assistant-ui@latest init     # add to existing project
```

Or install the packages directly:

```bash
npm install @assistant-ui/react @assistant-ui/ai-sdk ai
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/cli-init.webp" />
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/cli-init-light.webp" />
  <img src=".github/assets/cli-init-light.webp" alt="Running npx assistant-ui@latest init in a terminal" width="100%" />
</picture>

## Usage

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";

export function Chat() {
  const runtime = useChatRuntime();
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

`useChatRuntime` connects to the Vercel AI SDK out of the box. Swap it for `useLangGraphRuntime`, `useDataStreamRuntime`, or any custom runtime to integrate with your own backend.

## What you get

- **Composable primitives**: build any chat UX from `Thread`, `Message`, `Composer`, `ThreadList`, `ActionBar`, and friends. Style every pixel yourself, or start from a polished shadcn/ui theme that the CLI copies into your project.
- **Production UX out of the box**: streaming, auto-scroll, retries, attachments, markdown, code highlighting, voice dictation, keyboard shortcuts, and accessibility.
- **Generative UI**: render tool calls and JSON as React components, collect inline human approvals, and expose safe frontend actions to the model.
- **Strong TypeScript**: typed runtime APIs, tool schemas, message parts, and adapters end to end.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/generative-ui.png" />
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/generative-ui-light.png" />
  <img src=".github/assets/generative-ui-light.png" alt="A get_weather tool call rendered as a weather card inside an assistant-ui chat" width="100%" />
</picture>

## Backends

| Integration                            | Package                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| Vercel AI SDK                          | `@assistant-ui/ai-sdk`                                           |
| LangGraph / LangChain                  | `@assistant-ui/react-langgraph`, `@assistant-ui/react-langchain` |
| AG-UI / A2A protocols                  | `@assistant-ui/react-ag-ui`, `@assistant-ui/react-a2a`           |
| Google ADK / OpenCode                  | `@assistant-ui/react-google-adk`, `@assistant-ui/react-opencode` |
| Durable Flue agents                    | `@assistant-ui/react-flue`                                      |
| Custom data-stream backend             | `@assistant-ui/react-data-stream`                                |
| Managed thread history, telemetry, and file storage | `assistant-cloud`                                       |

Broad model support out of the box (OpenAI, Anthropic, Google Gemini, Mistral, Perplexity, AWS Bedrock, Azure, Fireworks, Ollama) plus community providers via the AI SDK, and easy extension to any custom HTTP backend.

## Customization

Instead of a single monolithic chat component, you compose primitives and bring your own styles. The CLI ships a great starter in your choice of Base UI (the default) or Radix UI flavor; you control everything else.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/anatomy.webp" />
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/anatomy-light.webp" />
  <img src=".github/assets/anatomy-light.webp" alt="A chat UI annotated with the primitives that build it: ThreadPrimitive.Viewport, MessagePrimitive.Root and Parts, makeAssistantToolUI, ActionBarPrimitive, BranchPickerPrimitive, and ComposerPrimitive.Input, Send and AddAttachment" width="100%" />
</picture>

## Used in production by

<p align="center">
  <a href="https://mastra.ai/?ref=assistant-ui"><img src=".github/assets/logos/Mastra.svg" height="24" alt="Mastra"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://langchain.com/?ref=assistant-ui"><img src=".github/assets/logos/LangChain.svg" height="24" alt="LangChain"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://athenaintelligence.ai/?ref=assistant-ui"><img src=".github/assets/logos/Athena-Intelligence.svg" height="24" alt="Athena Intelligence"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://browser-use.com/?ref=assistant-ui"><img src=".github/assets/logos/Browser-Use.svg" height="24" alt="Browser Use"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://stack-ai.com/?ref=assistant-ui"><img src=".github/assets/logos/Stack.svg" height="24" alt="Stack"></a>
  <br /><br />
  <a href="https://inconvo.com/?ref=assistant-ui"><img src=".github/assets/logos/Inconvo.svg" height="24" alt="Inconvo"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://iterable.com/?ref=assistant-ui"><img src=".github/assets/logos/Iterable.svg" height="24" alt="Iterable"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://helicone.ai/?ref=assistant-ui"><img src=".github/assets/logos/helicone.svg" height="24" alt="Helicone"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://getgram.ai/?ref=assistant-ui"><img src=".github/assets/logos/gram.svg" height="24" alt="Gram"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://coreviz.io/?ref=assistant-ui"><img src=".github/assets/logos/Coreviz.svg" height="24" alt="Coreviz"></a>
</p>

<p align="center"><sub>…and many more.</sub></p>

<a href="https://www.assistant-ui.com/traction">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://www.assistant-ui.com/traction-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="https://www.assistant-ui.com/traction.png" />
    <img src="https://www.assistant-ui.com/traction.png" alt="Chart of assistant-ui's traction" width="100%" />
  </picture>
</a>

## Demos

<table>
  <tr>
    <td align="center">
      <a href="https://youtu.be/ZW56UHlqTCQ">
        <img src="https://img.youtube.com/vi/ZW56UHlqTCQ/hqdefault.jpg" alt="Short Demo" />
      </a>
    </td>
    <td align="center">
      <a href="https://youtu.be/9eLKs9AM4tU">
        <img src="https://img.youtube.com/vi/9eLKs9AM4tU/hqdefault.jpg" alt="Long Demo" />
      </a>
    </td>
  </tr>
</table>

## Community & Support

- [Examples](https://www.assistant-ui.com/examples)
- [Documentation](https://www.assistant-ui.com/docs/)
- [Discord](https://discord.com/invite/S9dwgCNEFs)
- [Book a sales call](https://cal.com/simon-farshid/assistant-ui)

## License

MIT, with optional Assistant Cloud for managed thread persistence and analytics.

Backed by Y Combinator.
