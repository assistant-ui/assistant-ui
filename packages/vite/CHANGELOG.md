# @assistant-ui/vite

## 0.0.2

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: add @assistant-ui/vite — a Vite plugin (`aui()`) that compiles the `"use generative"` directive for Vite apps and TanStack Start. It transforms each toolkit per Vite environment (`client` keeps `render`, server environments keep `execute`), so no facade/redirect is needed; it also skips the Next-only `server-only` import, which has no `react-server` layer under Vite. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e)]:
  - @assistant-ui/x-generative-compiler@0.0.2
