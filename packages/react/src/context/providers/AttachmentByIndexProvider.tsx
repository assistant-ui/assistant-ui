"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";

import {
  AssistantApi,
  AssistantProvider,
  useAssistantApi,
  createAssistantApiField,
} from "../react/AssistantApiContext";

export const MessageAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo(() => {
    return {
      attachment: createAssistantApiField({
        source: "message",
        query: { type: "index", index },
        get: () => api.message().attachment({ index }),
      }),
    } satisfies Partial<AssistantApi>;
  }, [api, index]);

  return <AssistantProvider api={api2}>{children}</AssistantProvider>;
};

export const ComposerAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo(() => {
    return {
      attachment: createAssistantApiField({
        source: "composer",
        query: { type: "index", index },
        get: () => api.composer().attachment({ index }),
      }),
    } satisfies Partial<AssistantApi>;
  }, [api, index]);

  return <AssistantProvider api={api2}>{children}</AssistantProvider>;
};
