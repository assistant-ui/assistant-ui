import { Router } from "express";
import { dispatchCommand } from "../commands/dispatcher.js";
import type { SessionCommand } from "../commands/types.js";
import type { SessionManager } from "../sessions/SessionManager.js";

export function createSessionRoutes(sessionManager: SessionManager): Router {
  const router = Router();

  router.post("/sessions", async (req, res) => {
    try {
      const session = await sessionManager.create(req.body);
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get("/sessions", (_req, res) => {
    res.json(sessionManager.listSessions());
  });

  router.get("/sessions/:id", (req, res) => {
    const session = sessionManager.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json(session);
  });

  router.get("/sessions/:id/state", async (req, res) => {
    const state = await sessionManager.getState(req.params.id);
    if (!state) return res.status(404).json({ error: "Session not found" });
    return res.json(state);
  });

  router.post("/sessions/:id/commands", async (req, res) => {
    const managed = sessionManager.get(req.params.id);
    if (!managed) return res.status(404).json({ error: "Session not found" });

    const command = req.body as SessionCommand;
    if (!command?.type) {
      return res.status(400).json({ error: "Missing command type" });
    }

    const result = await dispatchCommand(managed.harness, command, managed.session, managed.eventBroker);
    return result.accepted ? res.json(result) : res.status(400).json(result);
  });

  router.get("/sessions/:id/events", (req, res) => {
    const managed = sessionManager.get(req.params.id);
    if (!managed) return res.status(404).json({ error: "Session not found" });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.write(": connected\n\n");

    const lastEventId = req.headers["last-event-id"];
    const history = managed.eventBroker.getHistory(typeof lastEventId === "string" ? lastEventId : undefined);
    for (const event of history) {
      res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    }

    const unsubscribe = managed.eventBroker.subscribe((event) => {
      res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15000);

    req.on("close", () => {
      unsubscribe();
      clearInterval(heartbeat);
    });
  });

  router.delete("/sessions/:id", async (req, res) => {
    const destroyed = await sessionManager.destroy(req.params.id);
    if (!destroyed) return res.status(404).json({ error: "Session not found" });
    return res.json({ ok: true });
  });

  return router;
}
