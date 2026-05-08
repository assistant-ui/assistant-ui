import { Router } from "express";
import type { SessionManager } from "../sessions/SessionManager.js";
import { sessionWorkspaceRegistry } from "../workspace-provider.js";
import {
  exportWorkspace,
  WorkspaceExportError,
} from "../workspace-export/index.js";

function sendJsonError(res: any, statusCode: number, message: string): void {
  res.status(statusCode).json({ error: message });
}

export function createWorkspaceExportRoutes(
  sessionManager: SessionManager,
): Router {
  const router = Router();

  router.get("/sessions/:id/workspace/export", async (req, res) => {
    const sessionId = req.params.id;
    const session = sessionManager.getSession(sessionId);
    if (!session) return sendJsonError(res, 404, "Session not found");

    const provisioned = sessionWorkspaceRegistry.get(sessionId);
    if (!provisioned)
      return sendJsonError(
        res,
        409,
        "No workspace is provisioned for this session.",
      );

    let cleanupCalled = false;
    const cleanupOnce = async (cleanup?: () => Promise<void>) => {
      if (!cleanup || cleanupCalled) return;
      cleanupCalled = true;
      await cleanup().catch(() => {});
    };

    try {
      const result = await exportWorkspace(provisioned, {
        sessionId,
        productId: "assistant-ui",
        format: "tar.gz",
      });

      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      res.setHeader("Cache-Control", "no-store");

      result.stream.on("error", async (error) => {
        await cleanupOnce(result.cleanup);
        if (!res.headersSent) {
          sendJsonError(
            res,
            500,
            error instanceof Error ? error.message : String(error),
          );
        } else {
          res.destroy(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      });

      res.on("finish", () => void cleanupOnce(result.cleanup));
      res.on("close", () => void cleanupOnce(result.cleanup));
      result.stream.pipe(res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (error instanceof WorkspaceExportError) {
        return sendJsonError(res, error.statusCode, error.message);
      }
      return sendJsonError(
        res,
        500,
        error instanceof Error ? error.message : String(error),
      );
    }
  });

  return router;
}
