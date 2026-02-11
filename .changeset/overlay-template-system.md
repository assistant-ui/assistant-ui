---
"mcp-app-studio": minor
---

feat: add overlay template system for project scaffolding

When the starter repo contains a `templates/` directory, the CLI now uses file overlays instead of codegen. Template-specific files are copied over the base, unwanted files are deleted per `deleteGlobs`, and the `templates/` directory is cleaned up. Falls back to legacy codegen for older starter repo versions.
