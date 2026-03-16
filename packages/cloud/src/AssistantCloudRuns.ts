import { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantStream, PlainTextDecoder } from "assistant-stream";

type AssistantCloudRunsStreamBody = {
  thread_id: string;
  assistant_id: "system/thread_title";
  messages: readonly unknown[]; // TODO type
};

// NOTE: Keep this payload shape aligned with the strict runtime validator in
// assistant-cloud: apps/aui-cloud-api/src/endpoints/runs/create.ts
// (createRunSchema). New telemetry fields must be added in both repos together.
export type AssistantCloudRunReport = {
  thread_id: string;
  status: "completed" | "incomplete" | "error";
  total_steps?: number;
  tool_calls?: {
    tool_name: string;
    tool_call_id: string;
    tool_args?: string;
    tool_result?: string;
    tool_source?: "mcp" | "frontend" | "backend";
    start_ms?: number;
    end_ms?: number;
    sampling_calls?: {
      model_id?: string;
      input_tokens?: number;
      output_tokens?: number;
      reasoning_tokens?: number;
      cached_input_tokens?: number;
      duration_ms?: number;
    }[];
  }[];
  steps?: {
    input_tokens?: number;
    output_tokens?: number;
    reasoning_tokens?: number;
    cached_input_tokens?: number;
    tool_calls?: {
      tool_name: string;
      tool_call_id: string;
      tool_args?: string;
      tool_result?: string;
      tool_source?: "mcp" | "frontend" | "backend";
      start_ms?: number;
      end_ms?: number;
      sampling_calls?: {
        model_id?: string;
        input_tokens?: number;
        output_tokens?: number;
        reasoning_tokens?: number;
        cached_input_tokens?: number;
        duration_ms?: number;
      }[];
    }[];
    start_ms?: number;
    end_ms?: number;
  }[];
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  model_id?: string;
  provider_type?: string;
  duration_ms?: number;
  output_text?: string;
  metadata?: Record<string, unknown>;
};

export class AssistantCloudRuns {
  constructor(private cloud: AssistantCloudAPI) {}

  public __internal_getAssistantOptions(assistantId: string) {
    return {
      api: `${this.cloud._baseUrl}/v1/runs/stream`,
      headers: async () => {
        const headers = await this.cloud._auth.getAuthHeaders();
        if (!headers) throw new Error("Authorization failed");
        return {
          ...headers,
          Accept: "text/plain",
        };
      },
      body: {
        assistant_id: assistantId,
        response_format: "vercel-ai-data-stream/v1",
        thread_id: "unstable_todo",
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
    return AssistantStream.fromResponse(response, new PlainTextDecoder());
  }

  public async report(
    body: AssistantCloudRunReport,
  ): Promise<{ run_id: string }> {
    return this.cloud.makeRequest("/runs", { method: "POST", body });
  }
}
