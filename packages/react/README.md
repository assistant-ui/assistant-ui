<a href="https://www.assistant-ui.com">
  <img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/header.svg" alt="assistant-ui Header" width="100%" />
</a>

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

Hundreds of companies and projects use assistant-ui to build in-app AI assistants, including <a href="https://langchain.com/?ref=assistant-ui"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/LangChain.svg" height="16" alt="LangChain"></a>, <a href="https://athenaintelligence.ai/?ref=assistant-ui"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Athena-Intelligence.svg" height="16" alt="Athena Intelligence"></a>, <a href="https://browser-use.com/?ref=assistant-ui"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Browser-Use.svg" height="16" alt="Browser Use"></a>, <a href="https://stack-ai.com/?ref=assistant-ui"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Stack.svg" height="16" alt="Stack"></a>, <a href="https://inconvo.com/?ref=assistant-ui"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Inconvo.svg" height="16" alt="Inconvo"></a>, <a href="https://helicone.ai/?ref=assistant-ui"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/helicone.svg" height="16" alt="Helicone"></a>, <a href="https://getgram.ai/?ref=assistant-ui"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/gram.svg" height="16" alt="Gram"></a>, <a href="https://coreviz.io/?ref=assistant-ui"><img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/logos/Coreviz.svg" height="16" alt="Coreviz"></a>, and more. 

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

---

Backed by Y Combinator. Building something with assistant-ui? We’d love to hear from you.
