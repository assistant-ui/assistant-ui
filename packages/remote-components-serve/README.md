# `@assistant-ui/remote-components-serve`

Serving layer for remote components: normalizes any HTML into a remote component (doctype, runtime tag, CSP). `./node` adds a Node middleware that serves a directory of pages and the runtime files.

```ts
import http from "node:http";
import { remoteComponentsMiddleware } from "@assistant-ui/remote-components-serve/node";

const serve = remoteComponentsMiddleware({ root: "widgets", frameAncestors: ["https://app.example"] });
http.createServer((req, res) => serve(req, res, () => res.writeHead(404).end())).listen(5173, "127.0.0.1");
```

Docs: https://www.assistant-ui.com/remote-components/docs/serving
