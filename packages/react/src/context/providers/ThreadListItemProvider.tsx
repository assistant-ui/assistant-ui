"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantProvider,
  useAssistantApi,
  createAssistantApiField,
  useExtendedAssistantApi,
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
  const baseApi = useAssistantApi();

  const partialApi = useMemo(() => {
    const getItem = () => baseApi.threads().item({ index, archived });
    return {
      threadListItem: createAssistantApiField({
        source: "threads",
        query: { type: "index", index, archived },
        get: () => getItem(),
      }),
      on(selector, callback) {
        const { event, scope } = normalizeEventSelector(selector);
        if (!checkEventScope("thread-list-item", scope, event))
          return baseApi.on(selector, callback);

        return baseApi.on({ scope: "*", event }, (e) => {
          if (e.threadId === getItem().getState().id) {
            callback(e);
          }
        });
      },
    } satisfies Partial<AssistantApi>;
  }, [baseApi, index, archived]);

  const api = useExtendedAssistantApi(partialApi);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};

export const ThreadListItemByIdProvider: FC<
  PropsWithChildren<{
    id: string;
  }>
> = ({ id, children }) => {
  const baseApi = useAssistantApi();

  const partialApi = useMemo(() => {
    const getItem = () => baseApi.threads().item({ id });
    return {
      threadListItem: createAssistantApiField({
        source: "threads",
        query: { type: "id", id },
        get: () => getItem(),
      }),
      on(selector, callback) {
        const { event, scope } = normalizeEventSelector(selector);
        if (!checkEventScope("thread-list-item", scope, event))
          return baseApi.on(selector, callback);

        return baseApi.on({ scope: "*", event }, (e) => {
          if (e.threadId !== getItem().getState().id) return;
          callback(e);
        });
      },
    } satisfies Partial<AssistantApi>;
  }, [baseApi, id]);

  const api = useExtendedAssistantApi(partialApi);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
