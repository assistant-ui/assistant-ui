"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantApiProvider,
  useAssistantApi,
} from "../react/AssistantApiContext";

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo(
    () =>
      ({
        message() {
          return api.thread().message({ index });
        },
        composer() {
          return api.thread().message({ index }).composer;
        },
        meta: {
          message: {
            source: "thread",
            query: {
              type: "index",
              index,
            },
          },
        },
      }) satisfies Partial<AssistantApi>,
    [api, index],
  );

  return <AssistantApiProvider api={api2}>{children}</AssistantApiProvider>;
};
