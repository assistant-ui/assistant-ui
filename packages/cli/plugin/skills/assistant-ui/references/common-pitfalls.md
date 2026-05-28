# Common Pitfalls

Comprehensive guide to common assistant-ui errors.

## Skipping assistant-ui Docs And CLI

Do not skip architecture, installation, and CLI docs and then manually scaffold with generic Next.js or React commands.

Use assistant-ui docs, examples, CLI commands, and registry components.

## Guessing CLI Flags

Do not assume CLI flags. Use the CLI docs or run help:

```bash
npx assistant-ui@latest <command> --help
```

## Confusing Local Components With Package Exports

Components under:

```text
@/components/assistant-ui/*
```

are project-local shadcn-based components. They are not the same thing as exports from:

```text
@assistant-ui/react
```

Customize local generated components when needed. Use `@assistant-ui/react` for primitives, hooks, runtime providers, and core APIs.

## Replacing Real Runtime/API Code With Mock-Only Code

Do not replace real API or LLM code with mock-only code.

Keep the real code path. Add a mock fallback only when useful, such as when environment keys are absent.

## Fabricating Docs URLs

Do not guess assistant-ui docs URLs. Use the docs index, known docs files, or MCP docs server.

## Replacing assistant-ui Architecture

Do not replace assistant-ui runtime/component architecture with custom chat state unless the user explicitly asks.

Preserve `AssistantRuntimeProvider`, existing runtime hooks/adapters, `Thread`/message/composer components, and registered tool UI patterns where present.
