import type { AssistantStream, AssistantStreamChunk } from "assistant-stream";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
} from "@assistant-ui/core";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import type { AdkEvent, AdkMessage } from "./types";
import { trimTrailingSlashes } from "./trimTrailingSlashes";

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

type AdkSessionResponse = {
  id: string;
  events?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAdkSessionResponse = (value: unknown): value is AdkSessionResponse => {
  if (!isRecord(value)) return false;

  const id = value.id;
  return typeof id === "string" && id.length > 0;
};

const parseAdkSessionResponse = (
  value: unknown,
  operation: "create" | "fetch" | "load",
): AdkSessionResponse => {
  if (!isAdkSessionResponse(value)) {
    throw new Error(
      `Invalid ADK session ${operation} response: expected an object with a non-empty string "id".`,
    );
  }
  return value;
};

const parseAdkSessionListResponse = (value: unknown): AdkSessionResponse[] => {
  if (!Array.isArray(value)) {
    throw new Error(
      "Invalid ADK session list response: expected an array of sessions.",
    );
  }

  return value.map((session, index) => {
    if (!isAdkSessionResponse(session)) {
      throw new Error(
        `Invalid ADK session list response: session at index ${index} must have a non-empty string "id".`,
      );
    }
    return session;
  });
};

const parseAdkArtifactListResponse = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(
      "Invalid ADK artifact list response: expected an array of artifact names.",
    );
  }

  return value.map((artifact, index) => {
    if (typeof artifact === "string" && artifact.length > 0) {
      return artifact;
    }

    if (isRecord(artifact)) {
      const filename = artifact.filename;
      if (typeof filename === "string" && filename.length > 0) {
        return filename;
      }
    }

    throw new Error(
      `Invalid ADK artifact list response: artifact at index ${index} must be a non-empty string or an object with a non-empty string "filename".`,
    );
  });
};

const parseAdkArtifactResponse = (value: unknown): AdkArtifactData => {
  if (!isRecord(value)) {
    throw new Error(
      'Invalid ADK artifact load response: expected an object containing "text" or "inlineData".',
    );
  }

  const { text, inlineData } = value;
  if (text === undefined && inlineData === undefined) {
    throw new Error(
      'Invalid ADK artifact load response: expected an object containing "text" or "inlineData".',
    );
  }

  if (text !== undefined && typeof text !== "string") {
    throw new Error(
      'Invalid ADK artifact load response: "text" must be a string when present.',
    );
  }

  if (
    inlineData !== undefined &&
    (!isRecord(inlineData) ||
      typeof inlineData.mimeType !== "string" ||
      typeof inlineData.data !== "string")
  ) {
    throw new Error(
      'Invalid ADK artifact load response: "inlineData" must contain string "mimeType" and "data" fields.',
    );
  }

  return value as AdkArtifactData;
};

const parseAdkArtifactVersionsResponse = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    throw new Error(
      "Invalid ADK artifact versions response: expected an array of version numbers.",
    );
  }

  return value.map((version, index) => {
    if (
      typeof version !== "number" ||
      !Number.isInteger(version) ||
      version < 0
    ) {
      throw new Error(
        `Invalid ADK artifact versions response: version at index ${index} must be a non-negative integer.`,
      );
    }
    return version;
  });
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
  const normalizedApiUrl = trimTrailingSlashes(apiUrl);
  const baseUrl = `${normalizedApiUrl}/apps/${encodeURIComponent(appName)}/users/${encodeURIComponent(userId)}/sessions`;

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
      const data = parseAdkSessionListResponse(await res.json());

      const threads: RemoteThreadMetadata[] = data.map((session) => ({
        status: "regular" as const,
        remoteId: session.id,
        externalId: session.id,
        title: undefined,
      }));

      return { threads };
    },

    async initialize(
      _threadId: string,
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
      const session = parseAdkSessionResponse(await res.json(), "create");
      return { remoteId: session.id, externalId: session.id };
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
      return Promise.resolve(
        new ReadableStream<AssistantStreamChunk>({
          start(controller) {
            controller.close();
          },
        }),
      );
    },

    async fetch(threadId: string): Promise<RemoteThreadMetadata> {
      const headers = await getHeaders();
      const res = await fetch(`${baseUrl}/${encodeURIComponent(threadId)}`, {
        headers,
      });
      if (!res.ok) {
        throw new Error(`Session not found: ${res.status}`);
      }
      const session = parseAdkSessionResponse(await res.json(), "fetch");
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
    const session = parseAdkSessionResponse(await res.json(), "load");

    if (session.events !== undefined && !Array.isArray(session.events)) {
      throw new Error(
        'Invalid ADK session load response: expected "events" to be an array when present.',
      );
    }

    const events = session.events as AdkEvent[] | undefined;

    if (!events?.length) {
      return { messages: [] };
    }

    const accumulator = new AdkEventAccumulator();
    let messages: AdkMessage[] = [];
    for (const event of events) {
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
      return parseAdkArtifactListResponse(await res.json());
    },

    async load(sessionId, artifactName, version?) {
      const headers = await getHeaders();
      let url = `${artifactBaseUrl(sessionId)}/${encodeURIComponent(artifactName)}`;
      if (version != null) url += `/versions/${version}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Failed to load artifact: ${res.status}`);
      return parseAdkArtifactResponse(await res.json());
    },

    async listVersions(sessionId, artifactName) {
      const headers = await getHeaders();
      const url = `${artifactBaseUrl(sessionId)}/${encodeURIComponent(artifactName)}/versions`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Failed to list artifact versions: ${res.status}`);
      }
      return parseAdkArtifactVersionsResponse(await res.json());
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
