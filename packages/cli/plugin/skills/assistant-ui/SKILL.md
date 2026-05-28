---
name: assistant-ui
description: Comprehensive assistant-ui framework guide for creating or modifying AI chat interfaces in React. Use for project setup, chat UI, runtimes, tools, tool UI, generative UI, CLI commands, docs lookup, migrations, and common architecture pitfalls.
license: MIT
metadata:
  author: assistant-ui
  version: "1.0.0"
  repository: https://github.com/assistant-ui/assistant-ui
---

# assistant-ui Framework Guide

assistant-ui is a React library for building AI chat interfaces. It provides composable UI primitives and shadcn-based components, runtime adapters for AI backends, and optional Assistant Cloud persistence.

This skill teaches you how to find current assistant-ui documentation and create or modify assistant-ui applications: chat threads, composers, messages, runtimes, backend tools, visible tool UI, generative UI, thread lists, migrations, and CLI-based setup.

## Critical: Do not trust internal knowledge

assistant-ui APIs, CLI commands, runtime adapters, and generated components can change between versions. Do not rely only on memory.

If installed package APIs conflict with remote docs, trust the installed package version for implementation details.

## Prerequisites

Before writing any assistant-ui code, check if packages are installed:

```bash
ls node_modules/@assistant-ui/
```

- If assistant-ui packages are installed: use hosted docs and local modules to get info.
- If packages are not installed: use the local references and remote docs to set up assistant-ui.

## Resources

### References

| User Question | First Check | How To |
| --- | --- | --- |
| Create/install new project or add components, run commands | [`references/cli.md`](references/cli.md) | CLI commands and flags for init, create, add, update, upgrade, mcp, info |
| How do I do X? | [`references/remote-docs.md`](references/remote-docs.md) | Fetch from `https://www.assistant-ui.com/llms.txt` to know more about assistant-ui |
| Need the architecture mental model | [`references/architecture.md`](references/architecture.md) | Frontend components -> runtime -> backend/agent flow |
| Upgrade or breaking-change guidance | [`references/migrations.md`](references/migrations.md) | Version upgrade workflows |
| I am getting an error? | [`references/common-pitfalls.md`](references/common-pitfalls.md) | Known errors and solutions from evals |

## Core concepts

Start with [`references/cli.md`](references/cli.md) for project setup, adding components, and running assistant-ui commands. Use  [`references/architecture.md`](references/architecture.md) for the mental model of how assistant-ui works on high level, concepts like runtimes, components, and backends connect. Use [`references/remote-docs.md`](references/remote-docs.md) to drill into specifics: runtimes, tools, generative UI, thread lists, and migration guides.


## When you see errors

Type errors often mean your knowledge is outdated.

Common signs:

- `Property X does not exist on type Y`
- `Cannot find module`
- `Type mismatch` errors
- Constructor parameter errors

What to do:

1. Check [`references/common-pitfalls.md`](references/common-pitfalls.md)
2. Verify current API in installed package files or hosted docs
3. Don't assume the error is a user mistake - it might be your outdated knowledge

## Development workflow

Always verify before writing code:

1. Check whether assistant-ui packages are installed
2. Look up the current API
   - If installed: understand architecture [`references/architecture.md`](references/architecture.md), remote docs [`references/remote-docs.md`](references/remote-docs.md), and then inspect local package source and types in `node_modules/@assistant-ui/`
   - If not installed: understand architecture [`references/architecture.md`](references/architecture.md), use remote docs [`references/remote-docs.md`](references/remote-docs.md)
3. Use CLI commands from [`references/cli.md`](references/cli.md); never guess flags
4. Write code based on current docs, preserving existing runtime and component architecture
