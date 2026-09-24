import { createAgentRouter } from "@flue/runtime/routing";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { DemoAgent } from "./agents/demo.ts";

const app = new Hono();

app.route("/api/agents/demo", createAgentRouter(DemoAgent));
app.use("*", serveStatic({ root: "./dist/client" }));
app.get("*", serveStatic({ path: "./dist/client/index.html" }));

export default app;
