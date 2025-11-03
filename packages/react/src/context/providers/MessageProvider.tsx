"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantProvider,
  AssistantApi,
  createAssistantApiField,
  useExtendedAssistantApi,
} from "../react/AssistantApiContext";
import { useResource } from "@assistant-ui/tap/react";
import { asStore } from "../../utils/tap-store";
import {
  ThreadMessageClientProps,
  ThreadMessageClient,
} from "../../client/ThreadMessageClient";

export const MessageProvider: FC<
  PropsWithChildren<ThreadMessageClientProps>
> = ({ children, ...props }) => {
  const store = useResource(asStore(ThreadMessageClient(props)));
  const partialApi = useMemo(() => {
    return {
      message: createAssistantApiField({
        source: "root",
        query: {},
        get: () => store.getState().api,
      }),
      subscribe: store.subscribe,
      flushSync: store.flushSync,
    } satisfies Partial<AssistantApi>;
  }, [store]);

  const api = useExtendedAssistantApi(partialApi);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
