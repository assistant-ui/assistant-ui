import {
  HttpAgent,
  runHttpRequest,
  transformHttpEventStream,
  type AgentSubscriber,
  type HttpAgentConfig,
  type RunAgentInput,
  type RunAgentParameters,
} from "@ag-ui/client";
import {
  ExportedMessageRepository,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { fromAgUiMessages } from "@assistant-ui/react-ag-ui";

export type DurableThread = {
  id: string;
  messages: unknown[];
  running: boolean;
};

export type DurableThreadSummary = {
  id: string;
  title: string;
  running: boolean;
  updatedAt: number;
};

type DurableHttpAgentConfig = Omit<HttpAgentConfig, "url"> & {
  /** Base URL of the server, e.g. `http://localhost:8000`. */
  baseUrl: string;
};

/**
 * An AG-UI HTTP agent for a server whose runs outlive the request.
 *
 * `connect()` rejoins the thread's run in flight, which the runtime calls when
 * a restored thread is still running. `abortRun()` cancels the run on the
 * server, so Stop stops it. Leaving the thread only drops the connection.
 */
export class DurableHttpAgent extends HttpAgent {
  readonly baseUrl: string;
  private runId: string | undefined;

  constructor({ baseUrl, ...config }: DurableHttpAgentConfig) {
    super({ ...config, url: `${baseUrl}/agent` });
    this.baseUrl = baseUrl;
  }

  private threadUrl(path = "") {
    return `${this.baseUrl}/threads/${encodeURIComponent(this.threadId)}${path}`;
  }

  override run(input: RunAgentInput) {
    this.runId = input.runId;
    return super.run(input);
  }

  override connectAgent(
    parameters?: RunAgentParameters,
    subscriber?: AgentSubscriber,
  ) {
    this.runId = undefined;
    this.abortController = new AbortController();
    return super.connectAgent(parameters, subscriber);
  }

  protected override connect(input: RunAgentInput) {
    return transformHttpEventStream(
      runHttpRequest(() =>
        this.fetch(
          `${this.baseUrl}/threads/${encodeURIComponent(input.threadId)}/stream`,
          {
            headers: { ...this.headers, Accept: "text/event-stream" },
            signal: this.abortController.signal,
          },
        ),
      ),
      this.debugLogger,
    );
  }

  override abortRun() {
    const query = this.runId ? `?run=${encodeURIComponent(this.runId)}` : "";
    void this.fetch(this.threadUrl(`/cancel${query}`), {
      method: "POST",
      headers: this.headers,
      keepalive: true,
    }).catch(() => {});
    super.abortRun();
  }

  override async detachActiveRun() {
    const detached = super.detachActiveRun();
    this.abortController.abort();
    await detached;
  }

  async getThread(threadId = this.threadId): Promise<DurableThread | null> {
    const response = await this.fetch(
      `${this.baseUrl}/threads/${encodeURIComponent(threadId)}`,
      { headers: this.headers },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GET thread failed: ${response.status}`);
    return (await response.json()) as DurableThread;
  }

  async listThreads(): Promise<DurableThreadSummary[]> {
    const response = await this.fetch(`${this.baseUrl}/threads`, {
      headers: this.headers,
    });
    if (!response.ok) throw new Error(`GET threads failed: ${response.status}`);
    return (await response.json()) as DurableThreadSummary[];
  }
}

export const toRepository = (thread: DurableThread | null) =>
  ExportedMessageRepository.fromArray(fromAgUiMessages(thread?.messages ?? []));

export const toThreadMessages = (
  thread: DurableThread | null,
): ThreadMessage[] =>
  toRepository(thread).messages.map(({ message }) => message);

/**
 * Restores the agent's current thread from the server. The server already
 * stores every message, so `append` has nothing to do.
 */
export const durableThreadHistory = (
  agent: DurableHttpAgent,
): ThreadHistoryAdapter => ({
  async load() {
    const thread = await agent.getThread();
    return {
      ...toRepository(thread),
      unstable_resume: thread?.running ?? false,
    };
  },
  async append() {},
});
