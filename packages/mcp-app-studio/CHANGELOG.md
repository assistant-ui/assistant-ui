# mcp-app-studio

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
