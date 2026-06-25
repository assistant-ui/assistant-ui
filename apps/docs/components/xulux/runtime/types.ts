import type { SelectedTemplateContext } from "../XuluxApp";

export type XuluxThreadStatus = "idle" | "running" | "interrupted";

export type XuluxCanvasSnapshot = {
  status: "empty" | "ready" | "error";
  url: string | null;
  source: "template" | "agent_template" | "refresh" | null;
  error: string | null;
  downloadUrl?: string;
  templateId?: string;
  versionId?: string;
  title?: string;
};

export type XuluxActivePreviewContext = {
  source: "template_modal" | "agent_tool";
  templateId: string;
  versionId?: string | null;
  customized: boolean;
  config?: Record<string, unknown>;
};

export type XuluxThreadCustom = {
  xuluxStatus: XuluxThreadStatus;
  sessionId: string;
  updatedAt: number;
  pendingUserMessage?: string | null;
  selectedTemplate?: SelectedTemplateContext | null;
  canvas?: XuluxCanvasSnapshot;
  activePreviewContext?: XuluxActivePreviewContext | null;
};

export type XuluxStoredThread = {
  remoteId: string;
  /** The sessionId used to correlate with /api/xulux/chat. Stored as externalId on cloud thread. */
  externalId?: string;
  status: "regular" | "archived";
  title?: string;
  custom: XuluxThreadCustom;
};
