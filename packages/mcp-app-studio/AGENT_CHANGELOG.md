# Agent Changelog

> This file helps coding agents understand project evolution, key decisions,
> and deprecated patterns. Updated: 2026-01-29

## Current State Summary

**mcp-app-studio** is a platform-agnostic SDK and CLI for building interactive apps that run on both ChatGPT and MCP hosts (like Claude Desktop). The package provides a unified bridge API with automatic platform detection, letting developers write apps once and deploy everywhere. Current version: 0.5.0.

## Stale Information Detected

| Location | States | Reality | Since |
|----------|--------|---------|-------|
| None detected | — | — | — |

## Timeline

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
- Use `UniversalProvider` for auto-detection (recommended)
- Platform-specific providers (`ChatGPTProvider`, `MCPProvider`) still available for direct use
- Use `useFeature()` hook to check capability availability at runtime
- Bridge pattern: `HostBridge` interface with `ChatGPTBridge` and `MCPBridge` implementations

**Key files:**
- `src/core/` — Types, bridge interface, capabilities
- `src/universal/` — Platform detection, provider, hooks
- `src/platforms/chatgpt/` — ChatGPT implementation
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
| Direct `window.openai` access | Use `ChatGPTBridge` or universal hooks | 2026-01-27 |
| Platform-specific conditional code | Use `useFeature()` for capability checks | 2026-01-27 |

## Trajectory

The package is evolving toward a fully platform-agnostic SDK. Recent work has focused on:
1. Unifying the API surface across ChatGPT and MCP platforms
2. Improving type safety and error handling
3. Documentation updates for the dual-platform support

Future development will likely continue abstracting platform differences and expanding the universal hook API as both ChatGPT Apps and MCP ext-apps ecosystems mature.
