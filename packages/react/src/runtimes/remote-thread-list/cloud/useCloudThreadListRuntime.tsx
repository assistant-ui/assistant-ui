"use client";

import { useEffect, useRef, useState } from "react";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { AssistantCloud } from "./AssistantCloud";
import { AssistantRuntime } from "../../../api";
import { RemoteThreadListSubscriber } from "../types";
import { toCoreMessages } from "../../edge";

type ThreadData = {
  externalId: string;
};

type CloudThreadListAdapter = {
  cloud: AssistantCloud;

  runtimeHook: () => AssistantRuntime;

  create?(): Promise<ThreadData>;
  delete?(threadId: string): Promise<void>;
};

const beginnable = <T,>(callback: () => Promise<T>) => {
  let task: Promise<T> | undefined = undefined;

  return () => {
    if (task === undefined) task = callback();
    return task;
  };
};

export const useCloudThreadListRuntime = (adapter: CloudThreadListAdapter) => {
  const adapterRef = useRef(adapter);
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  const [subscribers] = useState(() => new Set<RemoteThreadListSubscriber>());

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: adapter.runtimeHook,
    list: async () => {
      const { threads } = await adapter.cloud.threads.list();
      return {
        threads: threads.map((t) => ({
          status: t.is_archived ? "archived" : "regular",
          remoteId: t.id,
          title: t.title,
          externalId: t.external_id ?? undefined,
        })),
      };
    },

    initialize: async (threadId: string) => {
      const createTask = adapterRef.current.create?.() ?? Promise.resolve();
      const t = await createTask;
      const external_id = t ? t.externalId : undefined;
      const { thread_id: remoteId } =
        await adapterRef.current.cloud.threads.create({
          title: "New Thread",
          last_message_at: new Date(),
          external_id,
        });

      const dispose = runtime.threads
        .getById(threadId)
        .unstable_on("run-end", () => {
          dispose();

          const messages = runtime.threads
            .getById(threadId)
            .getState().messages;
          const begin = beginnable(() => {
            return adapterRef.current.cloud.runs.stream({
              thread_id: remoteId,
              assistant_id: "system/thread_title",
              messages: toCoreMessages(messages),
            });
          });
          for (const subscriber of subscribers) {
            subscriber.onGenerateTitle(remoteId, begin);
          }
        });

      return { externalId: external_id, remoteId: remoteId };
    },

    rename: async (threadId, newTitle) => {
      return adapter.cloud.threads.update(threadId, { title: newTitle });
    },
    archive: async (threadId) => {
      return adapter.cloud.threads.update(threadId, { is_archived: true });
    },
    unarchive: async (threadId) => {
      return adapter.cloud.threads.update(threadId, { is_archived: false });
    },
    delete: async (threadId) => {
      await adapter.delete?.(threadId);
      return adapter.cloud.threads.delete(threadId);
    },
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  });

  return runtime;
};
