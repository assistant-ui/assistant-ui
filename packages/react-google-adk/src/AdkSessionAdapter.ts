import type { AssistantStream, AssistantStreamChunk } from "assistant-stream";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
} from "@assistant-ui/core";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import type { AdkEvent, AdkMessage } from "./types";

export type AdkSessionAdapterOptions = {
  /**
   * ADK server base URL (e.g. "http://localhost:8000").
   */
  apiUrl: string;

  /**
   * ADK application name.
   */
  appName: string;

  /**
   * ADK user ID.
   */
  userId: string;

  /**
   * Extra headers for API requests.
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
    | undefined;
};

export type AdkArtifactData = {
  inlineData?: { mimeType: string; data: string } | undefined;
  text?: string | undefined;
};

type AdkSessionAdapterResult = {
  adapter: RemoteThreadListAdapter;
  load: (sessionId: string) => Promise<{ messages: AdkMessage[] }>;
  artifacts: {
    list: (sessionId: string) => Promise<string[]>;
    load: (
      sessionId: string,
      artifactName: string,
      version?: number,
    ) => Promise<AdkArtifactData>;
    listVersions: (
      sessionId: string,
      artifactName: string,
    ) => Promise<number[]>;
    delete: (sessionId: string, artifactName: string) => Promise<void>;
  };
};

/**
 * Creates a `RemoteThreadListAdapter` backed by ADK's session REST API,
 * plus a `load` function that reconstructs messages from session events.
 *
 * @example
 * ```ts
 * const { adapter, load } = createAdkSessionAdapter({
 *   apiUrl: "http://localhost:8000",
 *   appName: "my-app",
 *   userId: "user-1",
 * });
 *
 * const runtime = useAdkRuntime({
 *   stream: createAdkStream({ ... }),
 *   sessionAdapter: adapter,
 *   load,
 * });
 * ```
 */
export function createAdkSessionAdapter(
  options: AdkSessionAdapterOptions,
): AdkSessionAdapterResult {
  const { apiUrl, appName, userId } = options;
  const baseUrl = `${apiUrl}/apps/${encodeURIComponent(appName)}/users/${encodeURIComponent(userId)}/sessions`;

  const getHeaders = async (): Promise<Record<string, string>> => {
    if (!options.headers) return {};
    if (typeof options.headers === "function") return await options.headers();
    return options.headers;
  };

  const adapter: RemoteThreadListAdapter = {
    async list(): Promise<RemoteThreadListResponse> {
      const headers = await getHeaders();
      const res = await fetch(baseUrl, { headers });
      if (!res.ok) {
        throw new Error(`Failed to list sessions: ${res.status}`);
      }
      const data = (await res.json()) as Array<{
        id: string;
        app_name?: string;
        user_id?: string;
        last_update_time?: number;
      }>;

      const threads: RemoteThreadMetadata[] = data.map((session) => ({
        status: "regular" as const,
        remoteId: session.id,
        externalId: session.id,
        title: undefined,
      }));

      return { threads };
    },

    async initialize(
      threadId: string,
    ): Promise<RemoteThreadInitializeResponse> {
      const headers = await getHeaders();
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(`Failed to create session: ${res.status}`);
      }
      const session = (await res.json()) as { id: string };
      return { remoteId: threadId, externalId: session.id };
    },

    async delete(remoteId: string): Promise<void> {
      const headers = await getHeaders();
      const res = await fetch(`${baseUrl}/${encodeURIComponent(remoteId)}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete session: ${res.status}`);
      }
    },

    async rename(): Promise<void> {
      // ADK sessions don't support titles
    },

    async archive(): Promise<void> {
      // ADK sessions don't support archiving
    },

    async unarchive(): Promise<void> {
      // ADK sessions don't support archiving
    },

    generateTitle(): Promise<AssistantStream> {
      // Title generation not supported without assistant-cloud
      return Promise.resolve(new ReadableStream<AssistantStreamChunk>());
    },

    async fetch(threadId: string): Promise<RemoteThreadMetadata> {
      const headers = await getHeaders();
      const res = await fetch(`${baseUrl}/${encodeURIComponent(threadId)}`, {
        headers,
      });
      if (!res.ok) {
        throw new Error(`Session not found: ${res.status}`);
      }
      const session = (await res.json()) as { id: string };
      return {
        status: "regular",
        remoteId: session.id,
        externalId: session.id,
        title: undefined,
      };
    },
  };

  const load = async (
    sessionId: string,
  ): Promise<{ messages: AdkMessage[] }> => {
    const headers = await getHeaders();
    const res = await fetch(`${baseUrl}/${encodeURIComponent(sessionId)}`, {
      headers,
    });
    if (!res.ok) {
      throw new Error(`Failed to load session: ${res.status}`);
    }
    const session = (await res.json()) as {
      id: string;
      events?: AdkEvent[];
    };

    if (!session.events?.length) {
      return { messages: [] };
    }

    const accumulator = new AdkEventAccumulator();
    let messages: AdkMessage[] = [];
    for (const event of session.events) {
      messages = accumulator.processEvent(event);
    }
    return { messages };
  };

  const artifactBaseUrl = (sessionId: string) =>
    `${baseUrl}/${encodeURIComponent(sessionId)}/artifacts`;

  const artifacts: AdkSessionAdapterResult["artifacts"] = {
    async list(sessionId) {
      const headers = await getHeaders();
      const res = await fetch(artifactBaseUrl(sessionId), { headers });
      if (!res.ok) throw new Error(`Failed to list artifacts: ${res.status}`);
      const data = (await res.json()) as Array<{ filename: string }>;
      return data.map((a) => a.filename);
    },

    async load(sessionId, artifactName, version?) {
      const headers = await getHeaders();
      let url = `${artifactBaseUrl(sessionId)}/${encodeURIComponent(artifactName)}`;
      if (version != null) url += `/versions/${version}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Failed to load artifact: ${res.status}`);
      return (await res.json()) as AdkArtifactData;
    },

    async listVersions(sessionId, artifactName) {
      const headers = await getHeaders();
      const url = `${artifactBaseUrl(sessionId)}/${encodeURIComponent(artifactName)}/versions`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Failed to list artifact versions: ${res.status}`);
      }
      return (await res.json()) as number[];
    },

    async delete(sessionId, artifactName) {
      const headers = await getHeaders();
      const url = `${artifactBaseUrl(sessionId)}/${encodeURIComponent(artifactName)}`;
      const res = await fetch(url, { method: "DELETE", headers });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete artifact: ${res.status}`);
      }
    },
  };

  return { adapter, load, artifacts };
}
