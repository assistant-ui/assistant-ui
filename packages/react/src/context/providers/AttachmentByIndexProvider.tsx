"use client";

import { type FC, type PropsWithChildren } from "react";

import {
  AssistantProvider,
  useAssistantApi,
  useExtendedAssistantApi,
} from "../react/AssistantApiContext";
import { DerivedScope } from "../../utils/tap-store/derived-scopes";

export const MessageAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const baseApi = useAssistantApi();
  const api = useExtendedAssistantApi({
    attachment: DerivedScope({
      source: "message",
      query: { type: "index", index },
      get: () => baseApi.message().attachment({ index }),
    }),
  });

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};

export const ComposerAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const baseApi = useAssistantApi();
  const api = useExtendedAssistantApi({
    attachment: DerivedScope({
      source: "composer",
      query: { type: "index", index },
      get: () => baseApi.composer().attachment({ index }),
    }),
  });

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
