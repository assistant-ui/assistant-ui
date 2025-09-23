"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantProvider,
  useAssistantApi,
  createAssistantApiField,
} from "../react/AssistantApiContext";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo(() => {
    return {
      part: createAssistantApiField({
        source: "message",
        query: { type: "index", index },
        get: () => api.message().part({ index }),
      }),
    } satisfies Partial<AssistantApi>;
  }, [api, index]);

  return <AssistantProvider api={api2}>{children}</AssistantProvider>;
};
