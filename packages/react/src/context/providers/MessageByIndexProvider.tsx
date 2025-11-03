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

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const baseApi = useAssistantApi();
  const partialApi = useMemo(() => {
    const getMessage = () => baseApi.thread().message({ index });
    return {
      message: createAssistantApiField({
        source: "thread",
        query: { type: "index", index },
        get: () => getMessage(),
      }),
      composer: createAssistantApiField({
        source: "message",
        query: {},
        get: () => getMessage().composer,
      }),
      on(selector, callback) {
        const { event, scope } = normalizeEventSelector(selector);
        if (
          !checkEventScope("composer", scope, event) &&
          !checkEventScope("message", scope, event)
        )
          return baseApi.on(selector, callback);

        return baseApi.on({ scope: "thread", event }, (e) => {
          if (e.messageId === getMessage().getState().id) {
            callback(e);
          }
        });
      },
    } satisfies Partial<AssistantApi>;
  }, [baseApi, index]);

  const api = useExtendedAssistantApi(partialApi);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
