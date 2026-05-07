import express from "express";
import { readEnv } from "./config/env.js";
import { createExampleRoutes } from "./routes/examples.js";
import { createSessionRoutes } from "./routes/sessions.js";
import { createWorkspaceExportRoutes } from "./routes/workspace-export.js";
import { SessionManager } from "./sessions/SessionManager.js";

export function createAgentPlaygroundApp() {
  const app = express();
  const config = readEnv();
  const sessionManager = new SessionManager();

  app.use(express.json({ limit: "10mb" }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "assistant-ui-agent-playground-backend",
      sessions: sessionManager.size,
      uptime: process.uptime(),
    });
  });

  app.use("/api", createExampleRoutes());
  app.use("/api", createSessionRoutes(sessionManager));
  app.use("/api", createWorkspaceExportRoutes(sessionManager));

  return app;
}
