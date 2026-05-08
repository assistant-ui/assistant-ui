import { AUGMENT_API_BASE_URL } from "@/components/agent-playground/config/env";
import type {
  AgentSession,
  CommandResult,
  CreateSessionInput,
  FrontendExampleSummary,
  SessionCommand,
  SessionStateResponse,
  WorkspaceExportDownload,
} from "./types";

export class AugmentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
  }
}

/** Pulls `error` from augment JSON bodies like `{ accepted: false, error: "..." }`. */
function augmentErrorDetailFromBody(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown };
    if (typeof parsed.error === "string" && parsed.error.length > 0)
      return parsed.error;
  } catch {
    return null;
  }
  return null;
}

function formatFailedRequestMessage(
  method: string | undefined,
  path: string,
  status: number,
  bodyText: string,
): string {
  const detail = augmentErrorDetailFromBody(bodyText);
  const base = `${method ?? "GET"} ${path} failed with ${status}`;
  return detail ? `${base}: ${detail}` : base;
}

export class AugmentClient {
  constructor(private readonly baseUrl = AUGMENT_API_BASE_URL) {}

  async createSession(input: CreateSessionInput = {}): Promise<AgentSession> {
    return this.request<AgentSession>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getSessionState(sessionId: string): Promise<SessionStateResponse> {
    return this.request<SessionStateResponse>(
      `/sessions/${encodeURIComponent(sessionId)}/state`,
    );
  }

  async sendCommand(
    sessionId: string,
    command: SessionCommand,
  ): Promise<CommandResult> {
    return this.request<CommandResult>(
      `/sessions/${encodeURIComponent(sessionId)}/commands`,
      {
        method: "POST",
        body: JSON.stringify(command),
      },
    );
  }

  async listExamples(
    filter: Partial<{
      kind: "example" | "template" | undefined;
      tag: string | undefined;
      capability: string | undefined;
      product: string | undefined;
    }> = {},
  ): Promise<FrontendExampleSummary[]> {
    const params = new URLSearchParams();
    if (filter.kind) params.set("kind", filter.kind);
    if (filter.tag) params.set("tag", filter.tag);
    if (filter.capability) params.set("capability", filter.capability);
    if (filter.product) params.set("product", filter.product);

    const query = params.size ? `?${params.toString()}` : "";
    return this.request<FrontendExampleSummary[]>(`/examples${query}`);
  }

  getEventsUrl(sessionId: string): string {
    return `${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/events`;
  }

  async exportWorkspace(sessionId: string): Promise<WorkspaceExportDownload> {
    const path = `/sessions/${encodeURIComponent(sessionId)}/workspace/export`;
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {},
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AugmentApiError(
        formatFailedRequestMessage("GET", path, response.status, body),
        response.status,
        body,
      );
    }

    const contentType =
      response.headers.get("Content-Type") ?? "application/gzip";
    const filename =
      parseContentDispositionFilename(
        response.headers.get("Content-Disposition"),
      ) ?? `workspace-${sessionId.slice(0, 12)}.tar.gz`;

    return {
      blob: await response.blob(),
      filename,
      contentType,
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new AugmentApiError(
        formatFailedRequestMessage(init.method, path, response.status, text),
        response.status,
        text,
      );
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
}

export const augmentClient = new AugmentClient();

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(header);
  if (quotedMatch?.[1]) return quotedMatch[1].trim();

  const plainMatch = /filename=([^;]+)/i.exec(header);
  return plainMatch?.[1]?.trim() ?? null;
}
