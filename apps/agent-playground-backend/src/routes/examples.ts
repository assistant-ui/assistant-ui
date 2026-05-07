import { Router } from "express";
import { getFrontendExample, listFrontendExamples } from "../mixer/catalog/frontend.js";

export function createExampleRoutes(): Router {
  const router = Router();

  router.get("/examples", (req, res) => {
    try {
      const kind = req.query.kind;
      const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
      const capability = typeof req.query.capability === "string" ? req.query.capability : undefined;

      if (kind !== undefined && kind !== "example" && kind !== "template") {
        return res.status(400).json({ error: 'Invalid kind. Expected "example" or "template".' });
      }

      return res.json(listFrontendExamples({
        kind: kind as "example" | "template" | undefined,
        tag,
        capability,
      }));
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get("/examples/:id", (req, res) => {
    try {
      return res.json(getFrontendExample(req.params.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("Unknown recipe:")) return res.status(404).json({ error: message });
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
