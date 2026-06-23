import {
  createOpencodeClient,
  type GlobalSession,
} from "@opencode-ai/sdk/v2/client";

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

export const createOpenCodeThreadListAdapter = (
  client: ReturnType<typeof createOpencodeClient>,
) => ({
  list: async () => {
    const response = await client.experimental.session.list({
      roots: true,
      archived: true,
    });
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
    await client.session.update({
      sessionID: remoteId,
      title: newTitle,
    });
  },
  archive: async (remoteId: string) => {
    await client.session.update({
      sessionID: remoteId,
      time: { archived: Date.now() },
    });
  },
  unarchive: async (remoteId: string) => {
    await client.session.update({
      sessionID: remoteId,
      // The SDK models archived timestamps as numbers, but OpenCode uses
      // `null` here to clear the archived flag when unarchiving.
      time: { archived: null as never } as never,
    });
  },
  delete: async (remoteId: string) => {
    await client.session.delete({
      sessionID: remoteId,
    });
  },
  initialize: async () => {
    const response = await client.session.create({});
    if (!response.data?.id) {
      throw new Error("Failed to create OpenCode session");
    }
    return {
      remoteId: response.data.id,
      externalId: response.data.id,
    };
  },
  generateTitle: async (remoteId: string) => {
    await client.session.summarize({
      sessionID: remoteId,
    });
    // Title updates arrive through the OpenCode event stream, so this
    // placeholder stream only satisfies the remote thread list contract.
    return new ReadableStream({
      start(controller) {
        controller.close();
      },
    }) as never;
  },
  fetch: async (threadId: string) => {
    const response = await client.session.get({
      sessionID: threadId,
    });
    if (!response.data?.id) {
      throw new Error("OpenCode session not found");
    }
    return mapThreadMetadata(response.data as GlobalSession);
  },
});
