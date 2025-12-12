"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  AssistantProvider,
  useExtendedAssistantApi,
} from "../react/AssistantApiContext";
import { useResource } from "@assistant-ui/tap/react";
import { asStore } from "../../utils/tap-store";
import {
  ThreadMessageClientProps,
  ThreadMessageClient,
} from "../../client/ThreadMessageClient";
import { DerivedScope } from "../../utils/tap-store/derived-scopes";

export const MessageProvider: FC<
  PropsWithChildren<ThreadMessageClientProps>
> = ({ children, ...props }) => {
  const store = useResource(asStore(ThreadMessageClient(props)));
  const api = useExtendedAssistantApi({
    message: DerivedScope({
      source: "root",
      query: {},
      get: () => store.getState().api,
    }),
    subscribe: store.subscribe,
  });

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
