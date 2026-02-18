# mcp-app-studio

## 0.7.1

### Patch Changes

- 93910bd: Rename .tsx files to .ts where no JSX syntax is used

## 0.7.0

### Minor Changes

- a6a4e6d: feat: add overlay template system for project scaffolding

  When the starter repo contains a `templates/` directory, the CLI now uses file overlays instead of codegen. Template-specific files are copied over the base, unwanted files are deleted per `deleteGlobs`, and the `templates/` directory is cleaned up. Falls back to legacy codegen for older starter repo versions.

## 0.6.1

### Patch Changes

- a088518: chore: update dependencies

## 0.6.0

### Minor Changes

- acb2e3c: Adopt MCP-first breaking changes: remove the dedicated ChatGPT platform/entrypoint, treat ChatGPT as an MCP host, and align runtime metadata/extensions on the MCP bridge.

## 0.5.2

### Patch Changes

- e3a9a6f: Fix initial ChatGPT tool metadata emission.

## 0.5.1

### Patch Changes

- d45b893: chore: update dependencies
- e587399: Improve CLI scaffolding safety and template wiring (config-driven export defaults, version alignment, and server package naming).
- 6fedeab: Fix `preview:sync` by adding the missing template sync script and making it resilient to failures.
- a2e2450: docs: update testing checklist

## 0.5.0

### Minor Changes

- ee52ee2: Add universal MCP/ChatGPT SDK with platform auto-detection.
  - Rename package from chatgpt-app-studio to mcp-app-studio
  - Add core abstraction layer with types, capabilities, and bridge interface
  - Implement ChatGPT bridge wrapping window.openai API
  - Implement MCP bridge using @modelcontextprotocol/ext-apps SDK
  - Add universal provider with auto-detection for runtime platform
  - Create React hooks for both platforms (useHostContext, useToolInput, etc.)
  - Add multi-entry build (core, chatgpt, mcp exports)

  New exports:
  - mcp-app-studio (universal SDK with auto-detection)
  - mcp-app-studio/core (types and interfaces)
  - mcp-app-studio/chatgpt (ChatGPT-specific implementation)
  - mcp-app-studio/mcp (MCP-specific implementation)

### Patch Changes

- 1d862f2: fix(cli): auto-install server dependencies and update peer dependencies
  - **Auto-install server dependencies**: When creating a project with MCP server included, the CLI now injects a `postinstall` script that automatically runs `npm install` in the server directory. This eliminates the need for users to manually run `cd server && npm install` as a separate step.
  - **Fix peer dependency conflicts**: Updates `@assistant-ui/react`, `@assistant-ui/react-ai-sdk`, and `@assistant-ui/react-markdown` to compatible versions, resolving npm's `ERESOLVE` errors during installation.
  - **Fix appComponent export**: Generated `component-registry.tsx` now properly exports `appComponent`, fixing the import error in `workbench-shell.tsx`.

## 0.4.0

### Minor Changes

- Renamed package from `chatgpt-app-studio` to `mcp-app-studio`

  This package now supports both ChatGPT Apps (OpenAI Apps SDK) and MCP Apps
  (@anthropic/mcp-ext-apps) through a unified development experience. The rename
  reflects the broader scope of the tool.

  **Migration:** Update your CLI command from `npx chatgpt-app-studio` to `npx mcp-app-studio`.

- Added universal SDK with automatic platform detection
  - `useApp()` hook works across both ChatGPT and MCP platforms
  - `useFeature()` helper for capability-based feature toggling
  - Debug mode via `MCP_APP_DEBUG=true` environment variable

---

_The following entries are from when this package was published as `chatgpt-app-studio`:_

## 0.3.3

### Patch Changes

- 605d825: chore: update dependencies

## 0.3.2

### Patch Changes

- 3719567: chore: update deps

## 0.3.1

### Patch Changes

- 218fb69: refactor(chatgpt-app-studio): download template from GitHub instead of bundling in package

## 0.3.0

### Minor Changes

- a5c7e86: feat: Add chatgpt-app-studio package

  A CLI and development workbench for building ChatGPT Apps. Includes:
  - Interactive CLI for scaffolding new projects (`npx chatgpt-app-studio my-app`)
  - Local development workbench with live preview
  - OpenAI SDK simulation for testing widgets
  - MCP server generation for backend tools
  - Export bundler for production deployment
