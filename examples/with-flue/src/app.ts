import { createAgentRouter } from "@flue/runtime/routing";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { ChatAgent } from "./agents/chat.ts";

const app = new Hono();

app.route("/api/agents/chat", createAgentRouter(ChatAgent));
app.use("*", serveStatic({ root: "./dist/client" }));
app.get("*", serveStatic({ path: "./dist/client/index.html" }));

export default app;
