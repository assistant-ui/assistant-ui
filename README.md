"use client";

import React from "react";
import {
  AssistantUIProvider,
  ChatWindow,
  useAssistantUI,
} from "assistant-ui";

function OnyxHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-black/70">
      <div className="flex items-center gap-3">
        <a
          href="https://onyx.ai.cloud.app"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2"
        >
          <img
            src="/onyx-logo.svg"   // put your logo in public/onyx-logo.svg
            alt="Onyx"
            className="h-7 w-7"
          />
          <span className="text-lg font-semibold text-white tracking-wide">
            Onyx Zeus Assistant
          </span>
        </a>

        <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-700/40 border border-purple-500/60 text-purple-100">
          Creator: Mark
        </span>
      </div>

      <span className="text-xs text-neutral-400">
        Powered by your Onyx cloud node
      </span>
    </header>
  );
}

async function callOnyx(messages: { role: string; content: string }[]) {
  const res = await fetch("/api/onyx-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Onyx backend error: ${res.status}`);
  return res.json();
}

function OnyxChat() {
  const ui = useAssistantUI();

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-50">
      <OnyxHeader />
      <main className="flex-1">
        <ChatWindow
          className="h-full"
          onSend={async (inputText) => {
            const history = ui.getMessages();
            const messages = [
              ...history.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              { role: "user", content: inputText },
            ];
            const reply = await callOnyx(messages);
            ui.addMessage({
              role: "assistant",
              content: reply.content,
            });
          }}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AssistantUIProvider>
      <OnyxChat />
    </AssistantUIProvider>
  );
}


// Backend call helper – adjust to your Onyx proxy route
async function callOnyx(messages: { role: string; content: string }[]) {
  const res = await fetch("/api/onyx-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`Onyx backend error: ${res.status}`);
  }

  // Your /api/onyx-chat should normalize Onyx’s response to:
  // { role: "assistant", content: "..." }
  return res.json();
}

function OnyxChat() {
  const ui = useAssistantUI();

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-50">
      <OnyxHeader />
      <main className="flex-1">
        <ChatWindow
          className="h-full"
          onSend={async (inputText) => {
            const history = ui.getMessages();
            const messages = [
              ...history.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              { role: "user", content: inputText },
            ];

            const reply = await callOnyx(messages);
            ui.addMessage({
              role: "assistant",
              content: reply.content,
            });
          }}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AssistantUIProvider>
      <OnyxChat />
    </AssistantUIProvider>
  );
}


<p align="center">
  <a href="https://www.assistant-ui.com">Product</a> ·
  <a href="https://www.assistant-ui.com/docs">Documentation</a> ·
  <a href="https://www.assistant-ui.com/examples">Examples</a> ·
  <a href="https://discord.gg/S9dwgCNEFs">Discord Community</a> ·
  <a href="https://cal.com/simon-farshid/assistant-ui">Contact Sales</a>
</p>

[![npm version](https://img.shields.io/npm/v/@assistant-ui/react)](https://www.npmjs.com/package/@assistant-ui/react)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/react)](https://www.npmjs.com/package/@assistant-ui/react)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/assistant-ui/assistant-ui)
[![Weave Badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fapp.workweave.ai%2Fapi%2Frepository%2Fbadge%2Forg_GhSIrtWo37b5B3Mv0At3wQ1Q%2F722184017&cacheSeconds=3600)](https://app.workweave.ai/reports/repository/org_GhSIrtWo37b5B3Mv0At3wQ1Q/722184017)
![GitHub License](https://img.shields.io/github/license/assistant-ui/assistant-ui)
![Backed by Y Combinator](https://img.shields.io/badge/Backed_by-Y_Combinator-orange)
<!-- [![Manta Graph badge](https://getmanta.ai/api/badges?text=Manta%20Graph&link=assistant-ui)](https://getmanta.ai/assistant-ui) -->

[⭐️ Star us on GitHub](https://github.com/assistant-ui/assistant-ui)

## The UX of ChatGPT in your React app 💬🚀

**assistant-ui** is an open source TypeScript/React library to build production-grade AI chat experiences fast.

- Handles streaming, auto-scrolling, accessibility, and real-time updates for you
- Fully composable primitives inspired by shadcn/ui and cmdk — customize every pixel
- Works with your stack: AI SDK, LangGraph, Mastra, or any custom backend
- Broad model support out of the box (OpenAI, Anthropic, Mistral, Perplexity, AWS Bedrock, Azure, Google Gemini, Hugging Face, Fireworks, Cohere, Replicate, Ollama) with easy extension to custom APIs

## Why assistant-ui

- **Fast to production**: battle-tested primitives, built-in streaming and attachments
- **Designed for customization**: composable pieces instead of a monolithic widget
- **Great DX**: sensible defaults, keyboard shortcuts, a11y, and strong TypeScript
- **Enterprise-ready**: optional chat history and analytics via Assistant Cloud

## Getting Started

Run one of the following in your terminal:

```bash
npx assistant-ui create   # new project
npx assistant-ui init     # add to existing project
```

[![assistant-ui starter template](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/assistant-ui-starter.gif)](https://youtu.be/k6Dc8URmLjk)

## Features

- **Build**: composable primitives to create any chat UX (message list, input, thread, toolbar) and a polished shadcn/ui theme you can fully customize.

- **Ship**: production-ready UX out of the box — streaming, auto-scroll, retries, attachments, markdown, code highlighting, and voice input (dictation) — plus keyboard shortcuts and accessibility by default.

- **Generate**: render tool calls and JSON as components, collect human approvals inline, and enable safe frontend actions.

- **Integrate**: works with AI SDK, LangGraph, Mastra, or custom backends; broad provider support; optional chat history and analytics via Assistant Cloud (single env var).

## Backends

- **Assistant Cloud**: managed chat persistence and analytics. Deploy with the Cloud Starter template; bring any model/provider.

- **AI SDK**: integration with Vercel AI SDK; connect to any supported provider.

- **LangGraph**: integration with LangGraph and LangGraph Cloud; connect via LangChain providers.

- **Mastra**: integration with Mastra agents/workflows/RAG; model routing via Vercel AI SDK; optional Mastra Cloud.

- **Custom**: use assistant-ui on top of your own backend/streaming protocol.

## Customization

assistant-ui takes a Radix-style approach: instead of a single monolithic chat component, you compose primitives and bring your own styles. We provide a great starter config; you control everything else.

![Overview of components](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/components.png)

Sample customization to make a Perplexity lookalike:

![Perplexity clone created with assistant-ui](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/perplexity.gif)

## Traction

assistant-ui is the most popular UI library for building AI chat.

Hundreds of companies and projects use assistant-ui to build in-app AI assistants, including <a href="https://mastra.ai/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Mastra.svg" height="20" alt="Mastra"></a>, <a href="https://langchain.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/LangChain.svg" height="20" alt="LangChain"></a>, <a href="https://athenaintelligence.ai/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Athena-Intelligence.svg" height="20" alt="Athena Intelligence"></a>, <a href="https://browser-use.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Browser-Use.svg" height="20" alt="Browser Use"></a>, <a href="https://stack-ai.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Stack.svg" height="20" alt="Stack"></a>, <a href="https://inconvo.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Inconvo.svg" height="20" alt="Inconvo"></a>, <a href="https://iterable.com/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Iterable.svg" height="20" alt="Iterable"></a>, <a href="https://helicone.ai/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/helicone.svg" height="20" alt="Helicone"></a>, <a href="https://getgram.ai/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/gram.svg" height="20" alt="Gram"></a>, <a href="https://coreviz.io/?ref=assistant-ui" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Coreviz.svg" height="20" alt="Coreviz"></a>, and more.

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

- [Check out example demos](https://www.assistant-ui.com/)
- [Read the docs](https://www.assistant-ui.com/docs/)
- [Join our Discord](https://discord.com/invite/S9dwgCNEFs)
- [Book a sales call](https://cal.com/simon-farshid/assistant-ui)

// app/api/onyx-chat/route.ts (Next.js 13+)
// Adjust URL + headers to your Onyx cloud instance

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const onyxRes = await fetch("https://onyx.ai.cloud.app/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // e.g. auth header for your Onyx cloud, if needed
      // "Authorization": `Bearer ${process.env.ONYX_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!onyxRes.ok) {
    return NextResponse.json(
      { error: "Onyx upstream error" },
      { status: onyxRes.status }
    );
  }

  const data = await onyxRes.json();

  // Normalize to { content: "..." } for the UI
  return NextResponse.json({
    role: "assistant",
    content: data.content ?? data.answer ?? "",
  });
}

---

Backed by Y Combinator. Building something with assistant-ui? We’d love to hear from you.
