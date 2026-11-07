---
"@assistant-ui/docs-theme": patch
---

perf: the MDX headings and code blocks render as server components, and only their copy buttons are client components. On Next.js, a page with headings and code blocks loads 838 B gzipped of the theme's MDX client code instead of 2,750 B. `CodeGroup` stays a client component, since it switches tabs.
