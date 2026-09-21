---
"@assistant-ui/react-lexical": patch
---

fix: declare `lexical` and the `@lexical/*` packages as peer dependencies, so the app resolves one copy of lexical and custom plugins passed as `LexicalComposerInput` children find the composer context. npm, pnpm and bun install the peers on their own; a yarn app adds `lexical`, `@lexical/react`, `@lexical/utils`, `@lexical/history` and `@lexical/plain-text` itself
