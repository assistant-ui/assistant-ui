"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantApiProvider,
  useAssistantApi,
} from "../react/AssistantApiContext";
import { AssistantEvents, AssistantEventSelector } from "../../types";
import { Unsubscribe } from "@assistant-ui/tap";
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
      message() {
        return getMessage();
      },
      composer() {
        return getMessage().composer;
      },
      on<TEvent extends keyof AssistantEvents>(
        selector: AssistantEventSelector<TEvent>,
        callback: (e: AssistantEvents[TEvent]) => void,
      ): Unsubscribe {
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
      meta: {
        message: {
          source: "thread",
          query: {
            type: "index",
            index,
          },
        },
        composer: {
          source: "message",
          query: {},
        },
      },
    } satisfies Partial<AssistantApi>;
  }, [api, index]);

  return <AssistantApiProvider api={api2}>{children}</AssistantApiProvider>;
};
