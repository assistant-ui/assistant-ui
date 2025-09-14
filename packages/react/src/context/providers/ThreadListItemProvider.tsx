"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantProvider,
  useAssistantApi,
  createAssistantApiField,
} from "../react/AssistantApiContext";
import {
  checkEventScope,
  normalizeEventSelector,
} from "../../types/EventTypes";

export const ThreadListItemByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
    archived: boolean;
  }>
> = ({ index, archived, children }) => {
  const api = useAssistantApi();

  const api2 = useMemo(() => {
    const getItem = () => api.threads().item({ index, archived });
    return {
      threadListItem: createAssistantApiField({
        source: "threads",
        query: { type: "index", index, archived },
        get: () => getItem(),
      }),
      on(selector, callback) {
        const { event, scope } = normalizeEventSelector(selector);
        if (!checkEventScope("thread-list-item", scope, event))
          return api.on(selector, callback);

        return api.on({ scope: "*", event }, (e) => {
          if (e.threadId === getItem().getState().id) {
            callback(e);
          }
        });
      },
    } satisfies Partial<AssistantApi>;
  }, [api, index, archived]);

  return <AssistantProvider api={api2}>{children}</AssistantProvider>;
};

export const ThreadListItemByIdProvider: FC<
  PropsWithChildren<{
    id: string;
  }>
> = ({ id, children }) => {
  const api = useAssistantApi();

  const api2 = useMemo(() => {
    const getItem = () => api.threads().item({ id });
    return {
      threadListItem: createAssistantApiField({
        source: "threads",
        query: { type: "id", id },
        get: () => getItem(),
      }),
      on(selector, callback) {
        const { event, scope } = normalizeEventSelector(selector);
        if (!checkEventScope("thread-list-item", scope, event))
          return api.on(selector, callback);

        return api.on({ scope: "*", event }, (e) => {
          if (e.threadId !== getItem().getState().id) return;
          callback(e);
        });
      },
    } satisfies Partial<AssistantApi>;
  }, [api, id]);

  return <AssistantProvider api={api2}>{children}</AssistantProvider>;
};
