---
"@assistant-ui/react-artifact-runtime": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat(artifacts): add @assistant-ui/react-artifact-runtime for Claude-style React artifacts

A new opt-in `reactArtifactType` factory renders a single-file React component (TSX/JSX with `export default`) inside the existing `SafeContentFrame` iframe. The runtime compiles JSX via `@babel/standalone` loaded from a CDN, resolves library imports through an `<script type="importmap">`, and mounts the default export to a `<div id="root">`. A `claudeParityImportMap` named export ships React + Tailwind + lucide-react / recharts / framer-motion / three / @react-three/fiber / @react-three/drei / d3 / react-router-dom, all loaded with `?external=react,react-dom` so every library shares a single React instance.

Mechanism: `ArtifactSpec` grows an optional `renderToHtml(content) => string | Promise<string>` field. When set, `ArtifactPrimitive.Preview` calls `SafeContentFrame.renderHtml(wrapped)` instead of `renderRaw(content, mimeType, …)`. Existing text/html / SVG / Markdown / Mermaid types are unchanged.
