"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantProvider,
  useAssistantApi,
  createAssistantApiField,
  useExtendedAssistantApi,
} from "../react/AssistantApiContext";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const baseApi = useAssistantApi();
  const partialApi = useMemo(() => {
    return {
      part: createAssistantApiField({
        source: "message",
        query: { type: "index", index },
        get: () => baseApi.message().part({ index }),
      }),
    } satisfies Partial<AssistantApi>;
  }, [baseApi, index]);

  const api = useExtendedAssistantApi(partialApi);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
