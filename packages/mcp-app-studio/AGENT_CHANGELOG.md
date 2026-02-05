# Agent Changelog

> This file helps coding agents understand project evolution, key decisions,
> and deprecated patterns. Updated: 2026-02-05

## Current State Summary

**mcp-app-studio** is an MCP-first SDK and CLI for building interactive apps that run in any **MCP Apps host** (including ChatGPT). The SDK uses the standard `ui/*` bridge everywhere, and can optionally layer **ChatGPT-only extensions** from `window.openai` (widget state, file APIs, host modals, etc.) when available. Current version: 0.6.0.

## Stale Information Detected

| Location | States | Reality | Since |
|----------|--------|---------|-------|
| None detected | — | — | — |

## Timeline

### 2026-02-05 — MCP-first + ChatGPT Extensions (window.openai)

**What changed:** Major shift to match OpenAI’s “MCP Apps in ChatGPT” guidance:
- Removed the ChatGPT “platform” implementation (`src/platforms/chatgpt/*`) and the `mcp-app-studio/chatgpt` export.
- `Platform` is now `"mcp" | "unknown"`; `detectPlatform()` no longer returns `"chatgpt"`.
- `UniversalProvider` always uses the MCP Apps bridge and optionally layers ChatGPT-only extensions via `withChatGPTExtensions()` when `window.openai` exists.
- Added a connect timeout guard in the MCP bridge to avoid hanging forever outside a host.

**Why:** ChatGPT is an MCP Apps host; `window.openai` is an optional extensions layer (not a separate platform/protocol). Aligning to this makes the SDK “MCP-first” and portable across hosts.

**Agent impact:**
- If you were importing `mcp-app-studio/chatgpt`, switch to the universal SDK (`mcp-app-studio`) and use `hasChatGPTExtensions()` / `useFeature()` for extension-only features.
- If you were checking `platform === "chatgpt"`, switch to `hasChatGPTExtensions()` or `useFeature("widgetState")`.

**Deprecated:** None.

---

### 2026-01-27 — Package Renamed to mcp-app-studio

**What changed:** Package renamed from `chatgpt-app-studio` to `mcp-app-studio`. All internal references, docs, and CLI commands updated.

**Why:** The package now supports both ChatGPT and MCP platforms equally. The new name better reflects its dual-platform scope.

**Agent impact:**
- CLI command is now `npx mcp-app-studio` (not `npx chatgpt-app-studio`)
- Import paths: `import { ... } from "mcp-app-studio"`
- Template repo is `mcp-app-studio-starter`

**Deprecated:**
- `chatgpt-app-studio` package name — use `mcp-app-studio`
- Any references to the old CLI command

---

### 2026-01-27 — Universal SDK Architecture Added

**What changed:** Major refactor adding a platform-agnostic abstraction layer with automatic runtime detection.

**Why:** Enable single codebase to run on both ChatGPT and MCP platforms without conditional code.

**Agent impact:**
- Use `UniversalProvider` (recommended)
- Use `useFeature()` hook to check capability availability at runtime
- Bridge pattern: `HostBridge` interface with MCP bridge + optional ChatGPT extensions

**Key files:**
- `src/core/` — Types, bridge interface, capabilities
- `src/universal/` — Platform detection, provider, hooks
- `src/platforms/mcp/` — MCP implementation

---

### 2026-01 — Template Externalized to GitHub

**What changed:** Templates moved from bundled files to external GitHub repository (`mcp-app-studio-starter`).

**Why:** Smaller package size, templates can be updated independently of SDK releases.

**Agent impact:**
- CLI downloads templates from `https://github.com/assistant-ui/mcp-app-studio-starter`
- Template changes don't require SDK version bumps
- Network access required during scaffolding

---

### 2026-01-08 — Initial Package Creation (as chatgpt-app-studio)

**What changed:** Package created with CLI scaffolding tool and local development workbench for ChatGPT Apps.

**Why:** Streamline ChatGPT App development with unified tooling.

**Agent impact:** Historical context only — package has evolved significantly since.

---

## Deprecated Patterns

| Don't | Do Instead | Deprecated Since |
|-------|------------|------------------|
| `npx chatgpt-app-studio` | `npx mcp-app-studio` | 2026-01-27 |
| `import from "chatgpt-app-studio"` | `import from "mcp-app-studio"` | 2026-01-27 |
| Treat ChatGPT as a separate “platform” | Treat ChatGPT as an MCP host; use `hasChatGPTExtensions()` for `window.openai` | 2026-02-05 |
| Platform-specific conditional code | Use `useFeature()` for capability checks | 2026-01-27 |

## Trajectory

The package is evolving toward a fully platform-agnostic SDK. Recent work has focused on:
1. MCP-first behavior across hosts (including ChatGPT)
2. Keeping `window.openai` as optional extensions with clear boundaries
3. Improved error handling when rendered outside a host

Future development will likely continue refining MCP bridge compatibility and selectively wrapping additional `window.openai` extensions when it benefits developers without harming portability.
