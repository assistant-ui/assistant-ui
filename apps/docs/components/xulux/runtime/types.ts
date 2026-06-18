import type { SelectedTemplateContext } from "../XuluxApp";

export type XuluxThreadStatus = "idle" | "running" | "interrupted";

export type XuluxCanvasSnapshot = {
  status: "empty" | "ready" | "error";
  url: string | null;
  source: "template" | "refresh" | null;
  error: string | null;
  downloadUrl?: string;
  templateId?: string;
  versionId?: string;
  title?: string;
};

export type XuluxThreadCustom = {
  xuluxStatus: XuluxThreadStatus;
  sessionId: string;
  updatedAt: number;
  pendingUserMessage?: string | null;
  selectedTemplate?: SelectedTemplateContext | null;
  canvas?: XuluxCanvasSnapshot;
};

export type XuluxStoredThread = {
  remoteId: string;
  /** The sessionId used to correlate with /api/xulux/chat. Stored as externalId on cloud thread. */
  externalId?: string;
  status: "regular" | "archived";
  title?: string;
  custom: XuluxThreadCustom;
};
