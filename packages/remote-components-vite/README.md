# `@assistant-ui/remote-components-vite`

Optional Vite plugin for remote components: adds the runtime tag, turns component files into pages, and writes single-file builds.

```ts
import react from "@vitejs/plugin-react";
import { remoteComponents } from "@assistant-ui/remote-components-vite";

export default { plugins: [react(), remoteComponents({ components: "src/remotes", singleFile: { plugins: [react()] } })] };
```

Docs: https://www.assistant-ui.com/remote-components/docs/serving
