<a href="https://www.assistant-ui.com">
  <img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/header.svg" alt="assistant-ui Header" width="100%" style="width: 1000px" />
</a>

<p align="center">
  <a href="https://www.assistant-ui.com">Product</a> ·
  <a href="https://www.assistant-ui.com/docs/getting-started">Documentation</a> ·
  <a href="https://www.assistant-ui.com/examples">Examples</a> ·
  <a href="https://discord.gg/S9dwgCNEFs">Discord Community</a> ·
  <a href="https://cal.com/simon-farshid/assistant-ui">Contact Sales</a>
</p>

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/assistant-ui/assistant-ui)
[![Weave Badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fapp.workweave.ai%2Fapi%2Frepository%2Fbadge%2Forg_GhSIrtWo37b5B3Mv0At3wQ1Q%2F722184017&cacheSeconds=3600)](https://app.workweave.ai/reports/repository/org_GhSIrtWo37b5B3Mv0At3wQ1Q/722184017)
![Backed by Y Combinator](https://img.shields.io/badge/Backed_by-Y_Combinator-orange)

- [⭐️ Star us on GitHub](https://github.com/assistant-ui/assistant-ui)

## Framework for building agentic AI applications

**assistant-ui** is an open source library for React that sets the standard for building professional, full-featured, and performant AI chat applications. It handles the hard parts of building an AI chat app, including auto-scrolling, streaming, markdown rendering, syntax highlighting, accessibility, and more.

We provide composable components that make it easy to integrate with LangGraph, Mastra, Vercel AI SDK, or your own backend.

The API of assistant-ui is inspired by libraries like shadcn/ui and cmdk. Instead of a single monolithic chat component, developers get primitive components with smart defaults that can be dropped into your app or fully customized for your needs.

We have wide model provider support (OpenAI, Anthropic, Mistral, Perplexity, AWS Bedrock, Azure, Google Gemini, Hugging Face, Fireworks, Cohere, Replicate, Ollama) out of the box and the ability to integrate custom APIs.

## Getting Started

You can get started by running `npx assistant-ui create` to create a new project, or `npx assistant-ui init` to add assistant-ui to an existing project.

[![get started with assistant-ui starter template](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/assistant-ui-starter.gif)](https://youtu.be/k6Dc8URmLjk)

## Features

- shadcn/ui inspired for excellent DX, flexibility, and customizabliity
- Streaming, Auto-scrolling, Markdown, Code Highlighting, File Attachments, and more - all built in
- Keyboard shortcuts and accessibility features
- Automartically wire up generative UI with tool calls and agents
- Generative UI - Automatically wires up tools to custom UI components
- Frontend tool calls - Let LLMs take action in your frontend application
- Support for "human-in-the-loop" agentic workflows
- Chat history and analytics support out of the box with [assistant-cloud](https://cloud.assistant-ui.com)

## Choose your backend

- Vercel AI SDK
  - First class integration with AI SDK by Vercel. Connect to any LLM provider supported by AI SDK.
- LangGraph
  - First class integration with LangGraph and LangGraph Cloud. Connect to any LLM provider supported by LangChain.
- Mastra
  - First class integration into AI SDK by Vercel. Connect to any LLM provider supported by AI SDK
- Custom
  - Use assistant-ui as the frontend layer on top your own backend/streaming protocols.

## Customization

The API of assistant-ui is inspired by libraries like Radix UI and cmdk. Instead of a single monolithic chat component, we give you composable primitives and a great starter configuration. You have full control over the look and feel of every pixel while leaving auto-scrolling, LLM streaming and accessibility to us.

![Overview of components](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/components.png)

Sample customization to make a perplexity lookalike:

![Perplexity clone created with assistant-ui](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/perplexity.gif)

## **Demo Video**

[![Short Demo](https://img.youtube.com/vi/ZW56UHlqTCQ/hqdefault.jpg)](https://youtu.be/ZW56UHlqTCQ)

[![Long Demo](https://img.youtube.com/vi/9eLKs9AM4tU/hqdefault.jpg)](https://youtu.be/9eLKs9AM4tU)

## Traction

Hundreds of projects use assistant-ui to build in-app AI assistants, including companies like LangChain, AthenaIntelligence, Browser Use, and more.

With >100k monthly downloads, assistant-ui is the most popular UI library for building AI chat.

<img src="https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/.github/assets/growth.png" alt="Growth" style="max-width: 400px;">

## 2025 Q1 Roadmap

- [x] Assistant Cloud
- [x] Chat Persistence
- [x] React 19, Tailwind v4, NextJS 19 support
- [x] Improved Markdown rendering performance
- [x] LangGraph `interrupt()` support
- [x] Open in v0 support
- [ ] Improved documentation (work in progress)
- [ ] OpenAI Realtime Voice (work in progress)
- [ ] Resume interrupted LLM calls (work in progress)
- [ ] Native PDF attachment support
- [ ] Follow-up suggestions

## Next Steps

- [Check out example demos](https://www.assistant-ui.com/)
- [Read our docs](https://www.assistant-ui.com/docs/)
- [Join our Discord](https://discord.com/invite/S9dwgCNEFs)
- [Book a sales call](https://cal.com/simon-farshid/assistant-ui)
