# @assistant-ui/vite

Vite plugin for assistant-ui's **`"use generative"`** directive — a single file that
colocates a tool's schema, its server-only `execute`, and its client-only
`render`. Works with plain Vite apps and **TanStack Start**.

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { aui } from "@assistant-ui/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [aui(), tanstackStart(), viteReact()],
});
```

`aui()` sets `enforce: "pre"`, so it runs before `@vitejs/plugin-react`
lowers JSX — placement in the `plugins` array doesn't matter.

## How it works

Vite builds your app once per **environment**. The plugin's `transform` branches
on `this.environment.config.consumer`:

- **client** environment → client build: keeps `render` and any `"use client"`
  frontend `execute`, drops backend `execute`.
- **server** environments (TanStack Start's `ssr`, where the chat route and
  server functions live) → server build: keeps the backend `execute`, drops
  `render`.

No facade or redirect is needed (unlike the Next.js/Turbopack loader) — the
Environment API gives the plugin a reliable per-build signal directly.

Unlike the Next.js integration, the server build does **not** inject
`import "server-only"`: that guard relies on the `react-server` export condition,
which a TanStack Start `ssr` build doesn't set. The split is already structural —
the client build never contains the `execute` body.

## Authoring

Import the markers from `@assistant-ui/react`:

```tsx
"use generative";
import { defineToolkit, humanTool } from "@assistant-ui/react";
import { z } from "zod";

export default defineToolkit({
  get_weather: {
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => fetchWeather(city), // server-only
    render: ({ result }) => <Weather {...result} />, // client-only
  },
});
```

Register the compiled toolkit with `Tools({ toolkit })` on the client and your
server tool runner on the server — both import the same file.
