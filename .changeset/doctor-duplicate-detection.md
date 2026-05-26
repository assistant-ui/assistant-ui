---
"@assistant-ui/core": patch
"assistant-ui": patch
---

feat: detect and diagnose duplicate `@assistant-ui/core` installs

- In dev mode (`NODE_ENV !== "production"`), `@assistant-ui/core` now emits a single `console.warn` when it detects a second copy of itself loaded into the same JavaScript runtime. Mismatched transitive versions are a common source of subtle bugs (lost tool registrations, broken context lookups, failed `instanceof` checks — see issue #4101). The warning points users at `npx assistant-ui doctor`.
- New `assistant-ui doctor` CLI command. It walks `node_modules` recursively (including nested copies), surfaces every duplicate version of any `@assistant-ui/*`, `assistant-stream` or `assistant-cloud` package, queries the npm registry for the latest versions and reports outdated installs. Use `--no-network` to skip the registry check.
