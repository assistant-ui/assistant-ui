import type { Readable } from "node:stream";

export type WorkspaceExportFormat = "tar.gz";

export interface WorkspaceExportOptions {
  sessionId: string;
  productId?: string;
  format?: WorkspaceExportFormat;
}

export interface WorkspaceExportResult {
  filename: string;
  contentType: string;
  stream: Readable;
  cleanup?: () => Promise<void>;
}

export class WorkspaceExportError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "WorkspaceExportError";
  }
}
