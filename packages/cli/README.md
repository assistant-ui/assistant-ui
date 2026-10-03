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

`create` scaffolds from named templates: `default` (AI SDK), `minimal`, `cloud`, `cloud-clerk`, `cloud-harness`, `langchain`, `mcp`, `eve`. Pass `-t <name>`, pass `--example <name>` for examples such as `with-ai-sdk-v7`, use `--native` for Expo / React Native, use `--ink` for React Ink, or pass `--preset <url>` to scaffold from an `assistant-ui.com` playground link.

## Shared cloud chat

```bash
assistant-ui cloud setup multiplayer-chat
cd multiplayer-chat
npm run dev
```

Setup signs you in through your browser, selects or creates your organization
and project, provisions a hosted harness, and installs the shared chat starter.
Add your `OPENAI_API_KEY` to the generated `.env.local` before starting the app.
Open `http://localhost:3000/#main` in two browsers. Both clients share the
conversation and see replies as they stream. **Share this chat** copies the
current conversation's URL.

Select resources explicitly for a script or agent:

```bash
assistant-ui cloud setup multiplayer-chat --org team --new-project hackathon-chat --backend-url http://localhost:3000/api/chat --yes
```

Use `--project <id-or-slug>` for an existing project. A hackathon access code
can be supplied with `--access-code <code>` or `ASSISTANT_UI_ACCESS_CODE`.
`--use-npm`, `--use-pnpm`, `--use-yarn`, and `--use-bun` select the installer;
`--skip-install` leaves dependency installation to you. For a hosted app,
pass its HTTPS chat endpoint as `--backend-url` during initial setup. If you
deploy a chat first configured locally, update its backend allowlist in the
Cloud dashboard and its `backendUrl` in `.assistant-ui/cloud.json`, then rerun
setup with the same HTTPS `--backend-url`. Existing conversations keep their
original backend; open the deployed app with a fresh thread fragment such as
`#deployed-chat`, then use **Share this chat**.

The project API key stays in `.env.local`, with owner-only permissions and a
Git ignore entry. `.assistant-ui/cloud.json` stores the selected project and
harness IDs. Browser clients receive short-lived credentials from the app's
server and share the `hackathon` user. Add your application authentication to
`/api/credential` when the chat needs individual users or private access.

Run `assistant-ui cloud setup .` from an existing cloud-harness starter to resume
setup. Existing environment values are preserved; conflicting cloud settings
produce an error. `assistant-ui cloud login` signs in separately and
`assistant-ui cloud logout` revokes the saved CLI login.

## Documentation

Full command reference, flags, and template details at [assistant-ui.com/docs/cli](https://www.assistant-ui.com/docs/cli).
