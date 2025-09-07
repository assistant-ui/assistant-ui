"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantApiProvider,
  useAssistantApi,
  createAssistantApiField,
} from "../react/AssistantApiContext";
import { AssistantEventSelector, AssistantEvents } from "../../types";
import { Unsubscribe } from "@assistant-ui/tap";
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
      on<TEvent extends keyof AssistantEvents>(
        selector: AssistantEventSelector<TEvent>,
        callback: (e: AssistantEvents[TEvent]) => void,
      ): Unsubscribe {
        const { event, scope } = normalizeEventSelector(selector);
        if (scope !== "thread-list-item") return api.on(selector, callback);

        return api.on({ scope: "*", event }, (e: AssistantEvents[TEvent]) => {
          if (e.threadId === getItem().getState().id) {
            callback(e);
          }
        });
      },
    } satisfies Partial<AssistantApi>;
  }, [api, index, archived]);

  return <AssistantApiProvider api={api2}>{children}</AssistantApiProvider>;
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
      on<TEvent extends keyof AssistantEvents>(
        selector: AssistantEventSelector<TEvent>,
        callback: (e: AssistantEvents[TEvent]) => void,
      ): Unsubscribe {
        const { event, scope } = normalizeEventSelector(selector);
        if (!checkEventScope("thread-list-item", scope, event))
          return api.on(selector, callback);

        return api.on({ scope: "*", event }, (e: AssistantEvents[TEvent]) => {
          if (e.threadId !== getItem().getState().id) return;
          callback(e);
        });
      },
    } satisfies Partial<AssistantApi>;
  }, [api, id]);

  return <AssistantApiProvider api={api2}>{children}</AssistantApiProvider>;
};
