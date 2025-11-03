"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  AssistantProvider,
  useAssistantApi,
  useExtendedAssistantApi,
} from "../react/AssistantApiContext";
import { DerivedScope } from "../../utils/tap-store/derived-scopes";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const baseApi = useAssistantApi();
  const api = useExtendedAssistantApi({
    part: DerivedScope({
      source: "message",
      query: { type: "index", index },
      get: () => baseApi.message().part({ index }),
    }),
  });

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
