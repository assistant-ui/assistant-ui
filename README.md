<a href="https://www.assistant-ui.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/header-dark.svg" />
    <img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/header.svg" alt="assistant-ui Header" width="100%" />
  </picture>
</a>

<p align="center">
  <a href="https://www.assistant-ui.com">Product</a> ·
  <a href="https://www.assistant-ui.com/docs">Documentation</a> ·
  <a href="https://www.assistant-ui.com/examples">Examples</a> ·
  <a href="https://discord.gg/S9dwgCNEFs">Discord</a> ·
  <a href="https://cal.com/simon-farshid/assistant-ui">Contact Sales</a>
</p>

[![npm version](https://img.shields.io/npm/v/@assistant-ui/react)](https://www.npmjs.com/package/@assistant-ui/react)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/react)](https://www.npmjs.com/package/@assistant-ui/react)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/assistant-ui/assistant-ui)
[![Weave Badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fapp.workweave.ai%2Fapi%2Frepository%2Fbadge%2Forg_GhSIrtWo37b5B3Mv0At3wQ1Q%2F722184017&cacheSeconds=3600)](https://app.workweave.ai/reports/repository/org_GhSIrtWo37b5B3Mv0At3wQ1Q/722184017)
![GitHub License](https://img.shields.io/github/license/assistant-ui/assistant-ui)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)
![Backed by Y Combinator](https://img.shields.io/badge/Backed_by-Y_Combinator-orange)

## The UX of ChatGPT in your React app 💬🚀

**assistant-ui** is an open-source TypeScript/React library to build production-grade AI chat experiences fast.

## Installation

The fastest path is the CLI, which scaffolds a Next.js app or adds the styled components to an existing project:

```bash
npx assistant-ui@latest create   # new project
npx assistant-ui@latest init     # add to existing project
```

Or install the packages directly:

```bash
npm install @assistant-ui/react @assistant-ui/react-ai-sdk
```

## Usage

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

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

[![assistant-ui starter template](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/assistant-ui-starter.gif)](https://youtu.be/k6Dc8URmLjk)

## What you get

- **Composable primitives**: build any chat UX from `Thread`, `Message`, `Composer`, `ThreadList`, `ActionBar`, and friends. Style every pixel yourself, or start from a polished shadcn/ui theme that the CLI copies into your project.
- **Production UX out of the box**: streaming, auto-scroll, retries, attachments, markdown, code highlighting, voice dictation, keyboard shortcuts, and accessibility.
- **Generative UI**: render tool calls and JSON as React components, collect inline human approvals, and expose safe frontend actions to the model.
- **Strong TypeScript**: typed runtime APIs, tool schemas, message parts, and adapters end to end.

## Backends

| Integration                            | Package                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| Vercel AI SDK                          | `@assistant-ui/react-ai-sdk`                                     |
| LangGraph / LangChain                  | `@assistant-ui/react-langgraph`, `@assistant-ui/react-langchain` |
| AG-UI / A2A protocols                  | `@assistant-ui/react-ag-ui`, `@assistant-ui/react-a2a`           |
| Google ADK / OpenCode                  | `@assistant-ui/react-google-adk`, `@assistant-ui/react-opencode` |
| Custom data-stream backend             | `@assistant-ui/react-data-stream`                                |
| Managed thread history, telemetry, and file storage | `assistant-cloud`                                       |

Broad model support out of the box (OpenAI, Anthropic, Google Gemini, Mistral, Perplexity, AWS Bedrock, Azure, Fireworks, Ollama) plus community providers via the AI SDK, and easy extension to any custom HTTP backend.

## Customization

Radix-style: instead of a single monolithic chat component, you compose primitives and bring your own styles. The CLI ships a great starter; you control everything else.

![Overview of components](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/components.png)

Sample customization to make a Perplexity lookalike:

![Perplexity clone created with assistant-ui](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/perplexity.gif)

## Used in production by

<a href="https://mastra.ai/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Mastra.svg" height="20" alt="Mastra"></a>, <a href="https://langchain.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/LangChain.svg" height="20" alt="LangChain"></a>, <a href="https://athenaintelligence.ai/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Athena-Intelligence.svg" height="20" alt="Athena Intelligence"></a>, <a href="https://browser-use.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Browser-Use.svg" height="20" alt="Browser Use"></a>, <a href="https://stack-ai.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Stack.svg" height="20" alt="Stack"></a>, <a href="https://inconvo.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Inconvo.svg" height="20" alt="Inconvo"></a>, <a href="https://iterable.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Iterable.svg" height="20" alt="Iterable"></a>, <a href="https://helicone.ai/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/helicone.svg" height="20" alt="Helicone"></a>, <a href="https://getgram.ai/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/gram.svg" height="20" alt="Gram"></a>, <a href="https://coreviz.io/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Coreviz.svg" height="20" alt="Coreviz"></a>, and many more.

![Chart of assistant-ui's traction](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/traction.png)

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

## For other platforms

- React Native: [`@assistant-ui/react-native`](https://www.npmjs.com/package/@assistant-ui/react-native)
- Terminal (Ink): [`@assistant-ui/react-ink`](https://www.npmjs.com/package/@assistant-ui/react-ink)

## License

MIT, with optional Assistant Cloud for managed thread persistence and analytics.

Backed by Y Combinator.
