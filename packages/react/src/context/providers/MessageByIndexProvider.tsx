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

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo(() => {
    const getMessage = () => api.thread().message({ index });
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
          return api.on(selector, callback);

        return api.on({ scope: "thread", event }, (e) => {
          if (e.messageId === getMessage().getState().id) {
            callback(e);
          }
        });
      },
    } satisfies Partial<AssistantApi>;
  }, [api, index]);

  return <AssistantProvider api={api2}>{children}</AssistantProvider>;
};
