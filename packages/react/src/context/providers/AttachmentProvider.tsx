"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";

import {
  AssistantApi,
  AssistantApiProvider,
  useAssistantApi,
} from "../react/AssistantApiContext";

export const MessageAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo(() => {
    return {
      attachment() {
        return api.message().attachment({ index });
      },
      meta: {
        attachment: {
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

export const ComposerAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo(() => {
    return {
      attachment() {
        return api.composer().attachment({ index });
      },
      meta: {
        attachment: {
          source: "composer",
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
