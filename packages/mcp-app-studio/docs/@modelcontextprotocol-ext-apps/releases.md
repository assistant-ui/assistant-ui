# Release Notes

## 0.3.0

### Breaking Changes

- **`viewport` replaced with `containerDimensions`** — The `viewport` property in host context has been replaced with `containerDimensions`, which provides a clearer distinction between fixed dimensions and maximum constraints. The new type allows specifying either `height` or `maxHeight`, and either `width` or `maxWidth` by @martinalong in [#153](https://github.com/modelcontextprotocol/ext-apps/pull/153)

### New Examples

- **Video resource server** — Demonstrates video resource handling with proper mimeType declarations by @antonpk1 in [#175](https://github.com/modelcontextprotocol/ext-apps/pull/175)
- **Sheet music server** — Interactive sheet music notation example by @jonathanhefner in [#196](https://github.com/modelcontextprotocol/ext-apps/pull/196)

### Developer Experience

- **`npm start` alias** — Added `npm start` as alias for `npm run examples:start` by @jonathanhefner in [#183](https://github.com/modelcontextprotocol/ext-apps/pull/183)
- **Examples cleanup** — Improved consistency across example servers by @jonathanhefner in [#182](https://github.com/modelcontextprotocol/ext-apps/pull/182)
- **Documentation fixes** — Fixed tsc command in docs to use tsconfig.json by @blackgirlbytes in [#188](https://github.com/modelcontextprotocol/ext-apps/pull/188)

### Bug Fixes

- **Move prettier to dev dependency** — Fixed incorrect dependency classification by @niclim in [#179](https://github.com/modelcontextprotocol/ext-apps/pull/179)
- **Fix build errors in examples** — Resolved build issues across example servers by @jonathanhefner in [#180](https://github.com/modelcontextprotocol/ext-apps/pull/180)

**Full Changelog**: https://github.com/modelcontextprotocol/ext-apps/compare/v0.2.2...v0.3.0

---

## 0.2.2

Changes from 0.1.x to 0.2.2.

### Highlights

- **Server helpers** — New `registerAppTool()` and `registerAppResource()` simplify server setup with proper type safety. `connect()` now defaults to `PostMessageTransport(window.parent)`, enabling simpler initialization with just `await app.connect()` by @ochafik in [#165](https://github.com/modelcontextprotocol/ext-apps/pull/165)
- **Tool visibility control** — New `visibility` array field controls whether tools are visible to the agent, apps, or both. Restructured `_meta` format from flat `"ui/resourceUri"` to nested `_meta.ui.resourceUri` by @jonathanhefner in [#131](https://github.com/modelcontextprotocol/ext-apps/pull/131)
- **Host-provided theming** — Apps receive 36 standardized CSS variables for colors, typography, and spacing via `styles.variables`, enabling visual consistency with the host by @martinalong in [#127](https://github.com/modelcontextprotocol/ext-apps/pull/127)
- **Display mode requests** — Apps can request display mode changes (e.g., fullscreen) via `requestDisplayMode`, with hosts able to accept or reject by @martinalong in [#152](https://github.com/modelcontextprotocol/ext-apps/pull/152)
- **Custom fonts support** — Apps can receive custom fonts via `styles.css.fonts` and apply them using `applyHostFonts()` or `useHostFonts()` helpers by @martinalong in [#159](https://github.com/modelcontextprotocol/ext-apps/pull/159)

### API Changes

- **MCP SDK as peer dependency** — Consumers control their SDK version, reducing duplication by @ochafik in [#168](https://github.com/modelcontextprotocol/ext-apps/pull/168)
- **React as peer dependency** — Supports React 17, 18, and 19 by @ochafik in [#164](https://github.com/modelcontextprotocol/ext-apps/pull/164)
- **Renamed request methods** — Removed `send` prefix: `openLink()` and `teardownResource()`. Deprecated aliases maintained by @ochafik in [#161](https://github.com/modelcontextprotocol/ext-apps/pull/161)
- **Optional Client in AppBridge** — Enables custom forwarding scenarios without direct MCP client access by @ochafik in [#146](https://github.com/modelcontextprotocol/ext-apps/pull/146)
- **Zod v3 and v4 support** — Bring your own Zod by @alpic-ai in [#49](https://github.com/modelcontextprotocol/ext-apps/pull/49)
- **Zod schemas now version-agnostic** — Generated schemas work with both Zod 3.25+ and v4, using `z.object().passthrough()` instead of v4-only `z.looseObject()` by @ochafik in [#178](https://github.com/modelcontextprotocol/ext-apps/pull/178)

### Platform & DX

- **Windows compatibility** — Bun as optional dependency with automatic setup, `cross-env` for examples. Just run `npm install` by @ochafik in [#145](https://github.com/modelcontextprotocol/ext-apps/pull/145)
- **Widened `@oven/bun-*` version range** — Lowered the minimum from `^1.3.4` to `^1.2.21`, helping contributors whose registries may not have the latest packages by @ochafik in [#176](https://github.com/modelcontextprotocol/ext-apps/pull/176)
- **SSE transport support** — All examples now support both stdio and HTTP transports with SSE endpoints for older clients by @ochafik in [#136](https://github.com/modelcontextprotocol/ext-apps/pull/136)
- **Playwright E2E tests** — Screenshot golden testing across all 9 example servers with parallel execution (~28s) by @ochafik in [#115](https://github.com/modelcontextprotocol/ext-apps/pull/115)
- **hostContext exposure** — Access `hostContext` directly from the `App` class by @ochafik in [#139](https://github.com/modelcontextprotocol/ext-apps/pull/139)

### Bug Fixes

- **Responsive UIs** — Fixed narrow viewport handling for mobile and sidebar experiences by @ochafik in [#135](https://github.com/modelcontextprotocol/ext-apps/pull/135)
- **Sandbox notification fix** — Fixed `sandbox-ready` notification name to match implementation by @ochafik in [#160](https://github.com/modelcontextprotocol/ext-apps/pull/160)
- **Fixed non-UI tool registration** — Use `server.registerTool` for tools without UI and fix missing imports across examples by @ochafik in [#173](https://github.com/modelcontextprotocol/ext-apps/pull/173)

**Full Changelog**: https://github.com/modelcontextprotocol/ext-apps/compare/v0.1.1...v0.2.2
