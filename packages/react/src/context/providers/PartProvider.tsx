"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantApiProvider,
  useAssistantApi,
} from "../react/AssistantApiContext";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo(() => {
    return {
      part() {
        return api.message().part({ index });
      },
      meta: {
        part: {
          source: "message",
          query: {
            type: "index",
            index,
          },
        },
      } as const,
    } satisfies Partial<AssistantApi>;
  }, [api, index]);

  return <AssistantApiProvider api={api2}>{children}</AssistantApiProvider>;
};
