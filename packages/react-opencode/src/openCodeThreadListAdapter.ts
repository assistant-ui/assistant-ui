import {
  createOpencodeClient,
  type GlobalSession,
} from "@opencode-ai/sdk/v2/client";
import { OPEN_CODE_REQUEST_OPTIONS } from "./openCodeRequestOptions";

// OpenCode's `Session.isDefaultTitle` format, which a session carries until OpenCode titles it on its first prompt.
const DEFAULT_SESSION_TITLE =
  /^(New session - |Child session - )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const isDefaultSessionTitle = (title: string) =>
  DEFAULT_SESSION_TITLE.test(title);

const isArchivedSession = (session: Pick<GlobalSession, "time">) => {
  return typeof session.time.archived === "number";
};

const mapThreadMetadata = (session: {
  id: string;
  title: string;
  time: { archived?: number };
}) => ({
  status: isArchivedSession(session as GlobalSession)
    ? ("archived" as const)
    : ("regular" as const),
  remoteId: session.id,
  externalId: session.id,
  title: session.title,
});

export const createOpenCodeSession = async (
  client: ReturnType<typeof createOpencodeClient>,
) => {
  const response = await client.session.create({}, OPEN_CODE_REQUEST_OPTIONS);
  if (!response.data?.id) {
    throw new Error("Failed to create OpenCode session");
  }
  return {
    remoteId: response.data.id,
    externalId: response.data.id,
  };
};

export const createOpenCodeThreadListAdapter = (
  client: ReturnType<typeof createOpencodeClient>,
) => ({
  list: async () => {
    const response = await client.experimental.session.list(
      {
        roots: true,
        archived: true,
      },
      OPEN_CODE_REQUEST_OPTIONS,
    );
    const sessions = new Map<string, GlobalSession>();

    for (const session of response.data ?? []) {
      if (session.parentID) continue;
      sessions.set(session.id, session);
    }

    return {
      threads: [...sessions.values()].map(mapThreadMetadata),
    };
  },
  rename: async (remoteId: string, newTitle: string) => {
    await client.session.update(
      {
        sessionID: remoteId,
        title: newTitle,
      },
      OPEN_CODE_REQUEST_OPTIONS,
    );
  },
  archive: async (remoteId: string) => {
    await client.session.update(
      {
        sessionID: remoteId,
        time: { archived: Date.now() },
      },
      OPEN_CODE_REQUEST_OPTIONS,
    );
  },
  unarchive: async (remoteId: string) => {
    await client.session.update(
      {
        sessionID: remoteId,
        // The SDK models archived timestamps as numbers, but OpenCode uses
        // `null` here to clear the archived flag when unarchiving.
        time: { archived: null as never } as never,
      },
      OPEN_CODE_REQUEST_OPTIONS,
    );
  },
  delete: async (remoteId: string) => {
    await client.session.delete(
      {
        sessionID: remoteId,
      },
      OPEN_CODE_REQUEST_OPTIONS,
    );
  },
  initialize: () => createOpenCodeSession(client),
  // OpenCode titles a session itself on its first prompt, so this streams the title the session already has instead of generating one.
  generateTitle: async (remoteId: string) => {
    const response = await client.session.get(
      { sessionID: remoteId },
      OPEN_CODE_REQUEST_OPTIONS,
    );
    const title = response.data?.title;
    return new ReadableStream({
      start(controller) {
        if (title !== undefined && !isDefaultSessionTitle(title)) {
          controller.enqueue({
            type: "part-start",
            path: [0],
            part: { type: "text" },
          });
          controller.enqueue({
            type: "text-delta",
            path: [0],
            textDelta: title,
          });
          controller.enqueue({ type: "part-finish", path: [0] });
        }
        controller.close();
      },
    }) as never;
  },
  fetch: async (threadId: string) => {
    const response = await client.session.get(
      {
        sessionID: threadId,
      },
      OPEN_CODE_REQUEST_OPTIONS,
    );
    if (!response.data?.id) {
      throw new Error("OpenCode session not found");
    }
    return mapThreadMetadata(response.data as GlobalSession);
  },
});
