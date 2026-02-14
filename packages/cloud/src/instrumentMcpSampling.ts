/**
 * MCP sampling instrumentation utility.
 *
 * Wraps an MCP client's sampling handler to capture nested LLM calls
 * (sampling/createMessage requests) made during tool execution.
 * The captured data can be reported as child generation spans.
 */

export type SamplingCallData = {
  model_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  duration_ms?: number;
};

export type McpSamplingHandler = (
  request: McpSamplingRequest,
) => Promise<McpSamplingResponse>;

export type McpSamplingRequest = {
  method: "sampling/createMessage";
  params: {
    messages: unknown[];
    modelPreferences?: { hints?: { name?: string }[] };
    maxTokens?: number;
    [key: string]: unknown;
  };
};

export type McpSamplingResponse = {
  model?: string;
  content: unknown;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  [key: string]: unknown;
};

/**
 * Wraps an MCP sampling handler to intercept and measure sampling calls.
 *
 * @param handler - The original sampling handler from the MCP client
 * @param onSamplingCall - Callback invoked with metrics for each sampling call
 * @returns A wrapped handler that transparently captures sampling metrics
 *
 * @example
 * ```ts
 * const samplingCalls: SamplingCallData[] = [];
 * const wrapped = wrapSamplingHandler(
 *   originalHandler,
 *   (data) => samplingCalls.push(data),
 * );
 * // Use `wrapped` as the MCP client's sampling handler
 * // After tool execution, `samplingCalls` contains metrics for all nested LLM calls
 * ```
 */
export function wrapSamplingHandler(
  handler: McpSamplingHandler,
  onSamplingCall: (data: SamplingCallData) => void,
): McpSamplingHandler {
  return async (request) => {
    const startTime = Date.now();
    const response = await handler(request);
    const durationMs = Date.now() - startTime;

    const modelId =
      response.model ?? request.params.modelPreferences?.hints?.[0]?.name;

    const inputTokens =
      response.usage?.inputTokens ?? response.usage?.promptTokens;
    const outputTokens =
      response.usage?.outputTokens ?? response.usage?.completionTokens;

    onSamplingCall({
      ...(modelId ? { model_id: modelId } : undefined),
      ...(inputTokens != null ? { input_tokens: inputTokens } : undefined),
      ...(outputTokens != null ? { output_tokens: outputTokens } : undefined),
      duration_ms: durationMs,
    });

    return response;
  };
}

/**
 * Creates a collector that accumulates sampling call data during tool execution.
 * Use with `wrapSamplingHandler` to capture all sampling calls for a tool invocation.
 *
 * @example
 * ```ts
 * const collector = createSamplingCollector();
 * const wrappedHandler = wrapSamplingHandler(handler, collector.collect);
 * // ... execute MCP tool ...
 * const calls = collector.getCalls(); // SamplingCallData[]
 * ```
 */
export function createSamplingCollector() {
  const calls: SamplingCallData[] = [];
  return {
    collect: (data: SamplingCallData) => calls.push(data),
    getCalls: () => [...calls],
    reset: () => {
      calls.length = 0;
    },
  };
}
