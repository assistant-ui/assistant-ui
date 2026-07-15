import { serve } from "@hono/node-server";
import { MastraServer } from "@mastra/hono";
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";

config({ path: [".env.local", ".env"] });
const { mastra } = await import("./mastra/index.js");

const port = Number(process.env.MASTRA_PORT ?? 4111);
const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

const server = new MastraServer({ app, mastra });
await server.init();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Mastra server listening on http://localhost:${info.port}`);
});
