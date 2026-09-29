import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import type { AssistantCloudRunReportToolCall } from "./runTelemetry";
import { AssistantStream, PlainTextDecoder } from "assistant-stream";
import {
  CloudResponseError,
  readCloudRecord,
  readCloudString,
} from "./cloudResponse";

type AssistantCloudRunsStreamBody = {
  thread_id: string;
  assistant_id: "system/thread_title";
  messages: readonly unknown[]; // TODO type
};

// NOTE: Keep this payload shape aligned with the strict runtime validator in
// assistant-cloud: apps/api/src/endpoints/runs/create.ts
// (createRunSchema). New telemetry fields must be added in both repos together.
export type AssistantCloudRunReport = {
  thread_id: string;
  status: "completed" | "incomplete" | "error";
  outcome_type?:
    | "rate_limited"
    | "validation_failed"
    | "provider_error"
    | "server_error"
    | "budget_denied"
    | "persistence_error"
    | "aborted"
    | "timeout"
    | "disconnected"
    | "length"
    | "content_filter";
  message_id?: string;
  first_token_ms?: number;
  release?: string;
  environment?: string;
  tags?: string[];
  provider?: string;
  trace_id?: string;
  root_span_id?: string;
  error_code?: string;
  error?: string;
  total_steps?: number;
  tool_calls?: AssistantCloudRunReportToolCall[];
  steps?: {
    input_tokens?: number;
    output_tokens?: number;
    reasoning_tokens?: number;
    cached_input_tokens?: number;
    tool_calls?: AssistantCloudRunReportToolCall[];
    start_ms?: number;
    end_ms?: number;
    finish_reason?: string;
    input?: string;
  }[];
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  cost_usd?: number;
  cost_details?: {
    input?: number;
    input_cached_tokens?: number;
    output?: number;
    total?: number;
  };
  model_id?: string;
  provider_type?: string;
  duration_ms?: number;
  output_text?: string;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export class AssistantCloudRuns {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  public __internal_getAssistantOptions(assistantId: string) {
    return {
      api: `${this.cloud._baseUrl}/v1/runs/stream`,
      protocol: "ui-message-stream" as const,
      headers: async () => {
        const headers = await this.cloud._auth.getAuthHeaders();
        if (!headers) throw new Error("Authorization failed");
        return {
          ...headers,
          Accept: "text/plain",
          "Aui-Sdk": this.cloud.sdkHeader(),
        };
      },
      body: async (options?: { threadId?: string }) => {
        const threadId = options?.threadId;
        if (threadId === undefined) {
          throw new Error(
            "Assistant Cloud runs need a thread; the thread list adapter has not assigned a remote id to this thread yet.",
          );
        }
        return {
          assistant_id: assistantId,
          response_format: "vercel-ai-data-stream/v1",
          thread_id: threadId,
        };
      },
    };
  }

  public async stream(
    body: AssistantCloudRunsStreamBody,
  ): Promise<AssistantStream> {
    const response = await this.cloud.makeRawRequest("/runs/stream", {
      method: "POST",
      headers: {
        Accept: "text/plain",
      },
      body,
    });

    if (!response.body) {
      throw new CloudResponseError(
        'Invalid Assistant Cloud response for "run stream": expected a response body',
      );
    }

    const receivedContentType = response.headers.get("content-type");
    const contentType = receivedContentType
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (contentType !== "text/plain") {
      await response.body.cancel().catch(() => undefined);
      throw new CloudResponseError(
        `Invalid Assistant Cloud response for "run stream": expected a "text/plain" content type, received ${
          receivedContentType
            ? `"${receivedContentType}"`
            : "no Content-Type header"
        }`,
      );
    }

    return AssistantStream.fromResponse(response, new PlainTextDecoder());
  }

  public async report(
    body: AssistantCloudRunReport,
  ): Promise<{ run_id: string }> {
    const response = readCloudRecord(
      await this.cloud.makeRequest("/runs", { method: "POST", body }),
      "run report response",
    );

    return { run_id: readCloudString(response.run_id, "run_id") };
  }
}
