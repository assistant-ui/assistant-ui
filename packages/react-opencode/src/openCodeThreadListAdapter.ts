import {
  createOpencodeClient,
  type GlobalSession,
  type OpencodeClient,
} from "@opencode-ai/sdk/v2/client";
import { compareOpenCodeMessageOrder } from "./openCodeMessageOrder";

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

export const forkOpenCodeSession = async (
  client: OpencodeClient,
  sessionId: string,
  fromMessageId: string,
) => {
  const messagesResponse = await client.session.messages({
    sessionID: sessionId,
  });
  const messages = [...(messagesResponse.data ?? [])].sort((left, right) =>
    compareOpenCodeMessageOrder(left.info, right.info),
  );
  const sourceIndex = messages.findIndex(
    (message) => message.info.id === fromMessageId,
  );
  if (sourceIndex === -1) {
    throw new Error("OpenCode fork source message not found");
  }

  const boundaryMessageId = messages[sourceIndex + 1]?.info.id;
  const response = await client.session.fork({
    sessionID: sessionId,
    ...(boundaryMessageId ? { messageID: boundaryMessageId } : {}),
  });
  if (!response.data?.id) {
    throw new Error("Failed to fork OpenCode session");
  }
  return response.data.id;
};

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
  fork: async (
    remoteId: string,
    options?: { fromMessageId?: string | undefined },
  ) => {
    if (!options?.fromMessageId) {
      throw new Error("OpenCode fork requires a source message id");
    }

    const forkedSessionId = await forkOpenCodeSession(
      client,
      remoteId,
      options.fromMessageId,
    );
    return {
      remoteId: forkedSessionId,
      externalId: forkedSessionId,
    };
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
