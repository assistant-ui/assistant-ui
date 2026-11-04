---
"@assistant-ui/docs-theme": patch
---

feat: `theme: assistantUi()` with `@assistant-ui/docs-theme/styles.css` now gives the assistant-ui docs look on every Farming Labs framework, without a custom layout. The theme renders the header across the top with search, `nav.links` and the theme toggle, a skip link, previous/next arrows and a page actions menu beside the title (Copy page, View as Markdown, Open in Claude or Codex, Copy MCP server URL), table of contents actions, a flat sidebar and no breadcrumb; site configuration overrides any of these defaults. The stylesheet applies only to layouts marked `data-fd-theme="assistant-ui"`. Requires Farming Labs Docs and Theme 0.2.139. `createDocsLayout` keeps its own header and page controls, now built on Fumadocs' framework-neutral `Link` and `usePathname`, which adds `fumadocs-core` as a peer. `assistantUiDefaults` exports the theme's configuration defaults.
