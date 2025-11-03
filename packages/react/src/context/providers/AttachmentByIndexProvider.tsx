"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";

import {
  AssistantApi,
  AssistantProvider,
  useAssistantApi,
  createAssistantApiField,
  useExtendedAssistantApi,
} from "../react/AssistantApiContext";

export const MessageAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const baseApi = useAssistantApi();
  const partialApi = useMemo(() => {
    return {
      attachment: createAssistantApiField({
        source: "message",
        query: { type: "index", index },
        get: () => baseApi.message().attachment({ index }),
      }),
    } satisfies Partial<AssistantApi>;
  }, [baseApi, index]);

  const api = useExtendedAssistantApi(partialApi);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};

export const ComposerAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const baseApi = useAssistantApi();
  const partialApi = useMemo(() => {
    return {
      attachment: createAssistantApiField({
        source: "composer",
        query: { type: "index", index },
        get: () => baseApi.composer().attachment({ index }),
      }),
    } satisfies Partial<AssistantApi>;
  }, [baseApi, index]);

  const api = useExtendedAssistantApi(partialApi);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
