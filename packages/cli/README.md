# `assistant-ui` CLI

[![npm version](https://img.shields.io/npm/v/assistant-ui)](https://www.npmjs.com/package/assistant-ui)
[![npm downloads](https://img.shields.io/npm/dm/assistant-ui)](https://www.npmjs.com/package/assistant-ui)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Command-line tool for adding shadcn-style components to your project, scaffolding a new app, and keeping your assistant-ui packages up to date.

## Installation

Run via your package manager of choice; nothing to install globally:

```bash
npx assistant-ui@latest <command>
pnpm dlx assistant-ui@latest <command>
yarn dlx assistant-ui@latest <command>
bunx assistant-ui@latest <command>
```

## Common tasks

```bash
# scaffold a new Next.js project
npx assistant-ui@latest create my-app

# scaffold a minimal project
npx assistant-ui@latest create my-app --template minimal

# scaffold from a feature example
npx assistant-ui@latest create my-app --example with-ai-sdk-v7

# scaffold an Expo / React Native project
npx assistant-ui@latest create my-app --native

# scaffold a React Ink terminal project
npx assistant-ui@latest create my-app --ink

# add assistant-ui to an existing project
npx assistant-ui@latest init

# initialize non-interactively for CI or agent flows
npx assistant-ui@latest init --yes

# add a component
npx assistant-ui@latest add thread

# update all @assistant-ui/* and assistant-* packages
npx assistant-ui@latest update

# run codemods after a major version bump
npx assistant-ui@latest upgrade

# print env + version info for a bug report
npx assistant-ui info
```

`init` falls back to `create` when no `package.json` is found, so a single command works for both new and existing projects. Use `init --yes` for CI and agent flows where prompts are not available.

## Templates

`create` scaffolds from named templates: `default` (AI SDK), `minimal`, `cloud`, `cloud-clerk`, `langchain`, `mcp`, `eve`. Pass `-t <name>`, pass `--example <name>` for examples such as `with-ai-sdk-v7`, use `--native` for Expo / React Native, use `--ink` for React Ink, or pass `--preset <url>` to scaffold from an `assistant-ui.com` playground link.

## Documentation

Full command reference, flags, and template details at [assistant-ui.com/docs/cli](https://www.assistant-ui.com/docs/cli).
