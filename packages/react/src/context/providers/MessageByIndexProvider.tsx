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

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const baseApi = useAssistantApi();
  const api = useExtendedAssistantApi({
    message: DerivedScope({
      source: "thread",
      query: { type: "index", index },
      get: () => baseApi.thread().message({ index }),
    }),
    composer: DerivedScope({
      source: "message",
      query: {},
      get: () => baseApi.thread().message({ index }).composer,
    }),
    on(selector, callback) {
      const getMessage = () => baseApi.thread().message({ index });
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
  });

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
