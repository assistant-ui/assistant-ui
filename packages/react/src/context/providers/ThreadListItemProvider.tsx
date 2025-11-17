"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  AssistantProvider,
  useAssistantApi,
  useExtendedAssistantApi,
} from "../react/AssistantApiContext";
import {
  checkEventScope,
  normalizeEventSelector,
} from "../../types/EventTypes";
import { DerivedScope } from "../../utils/tap-store/derived-scopes";

export const ThreadListItemByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
    archived: boolean;
  }>
> = ({ index, archived, children }) => {
  const baseApi = useAssistantApi();

  const api = useExtendedAssistantApi({
    threadListItem: DerivedScope({
      source: "threads",
      query: { type: "index", index, archived },
      get: () => baseApi.threads().item({ index, archived }),
    }),
    on(selector, callback) {
      const getItem = () => baseApi.threads().item({ index, archived });
      const { event, scope } = normalizeEventSelector(selector);
      if (!checkEventScope("thread-list-item", scope, event))
        return baseApi.on(selector, callback);

      return baseApi.on({ scope: "*", event }, (e) => {
        if (e.threadId === getItem().getState().id) {
          callback(e);
        }
      });
    },
  });

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};

export const ThreadListItemByIdProvider: FC<
  PropsWithChildren<{
    id: string;
  }>
> = ({ id, children }) => {
  const baseApi = useAssistantApi();

  const api = useExtendedAssistantApi({
    threadListItem: DerivedScope({
      source: "threads",
      query: { type: "id", id },
      get: () => baseApi.threads().item({ id }),
    }),
    on(selector, callback) {
      const getItem = () => baseApi.threads().item({ id });
      const { event, scope } = normalizeEventSelector(selector);
      if (!checkEventScope("thread-list-item", scope, event))
        return baseApi.on(selector, callback);

      return baseApi.on({ scope: "*", event }, (e) => {
        if (e.threadId !== getItem().getState().id) return;
        callback(e);
      });
    },
  });

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
