# `create-assistant-ui`

[![npm version](https://img.shields.io/npm/v/create-assistant-ui)](https://www.npmjs.com/package/create-assistant-ui)
[![npm downloads](https://img.shields.io/npm/dm/create-assistant-ui)](https://www.npmjs.com/package/create-assistant-ui)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Scaffold a new assistant-ui project from a chosen template (default AI SDK, minimal, cloud, langchain, MCP, Eve, and more).

## Usage

```bash
npm create assistant-ui my-app
pnpm create assistant-ui my-app
yarn create assistant-ui my-app
bunx create-assistant-ui my-app
```

This wraps the `assistant-ui create` command from the [`assistant-ui` CLI](https://www.npmjs.com/package/assistant-ui). Pass `-t <template>` to pick a starter, or `--preset <url>` to scaffold from an `assistant-ui.com` playground link.

## Templates

| Name           | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `default`      | Next.js + Vercel AI SDK (the recommended starting point).  |
| `minimal`      | Smallest possible Next.js + assistant-ui setup.            |
| `cloud`        | Default template plus Assistant Cloud thread persistence.  |
| `cloud-clerk`  | Cloud template with Clerk authentication.                  |
| `langchain`    | Next.js + LangGraph agent via the react-langchain adapter. |
| `mcp`          | Next.js + an MCP server integration.                       |
| `eve`          | Next.js + Eve agent backend.                               |

## Documentation

Full template list and flag reference at [assistant-ui.com/docs/cli](https://www.assistant-ui.com/docs/cli).
