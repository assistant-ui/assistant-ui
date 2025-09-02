"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApi,
  AssistantApiProvider,
  useAssistantApi,
} from "../react/AssistantApiContext";
import { ThreadListClientActions } from "../../client/ThreadListClient";

export namespace ThreadListItemProvider {
  export type Props = PropsWithChildren<{
    id: Parameters<ThreadListClientActions["item"]>[0];
    meta: NonNullable<AssistantApi["meta"]["threadListItem"]>;
  }>;
}

const ThreadListItemProvider: FC<ThreadListItemProvider.Props> = ({
  id: idOrSelector,
  children,
  meta,
}) => {
  const api = useAssistantApi();

  const client = useMemo(() => {
    return {
      threadListItem() {
        return api.threads().item(idOrSelector);
      },
      meta: {
        threadListItem: meta,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AssistantApiProvider api={client}>{children}</AssistantApiProvider>;
};

export const ThreadListItemByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
    archived: boolean;
  }>
> = ({ index, archived, children }) => {
  const api = useAssistantApi();

  const api2 = useMemo(() => {
    return {
      threadListItem() {
        return api.threads().item({ index, archived });
      },
      meta: {
        threadListItem: {
          source: "threads",
          query: {
            type: "index",
            index,
            archived,
          },
        },
      },
    } satisfies Partial<AssistantApi>;
  }, [api, index, archived]);

  return <AssistantApiProvider api={api2}>{children}</AssistantApiProvider>;
};

export const ThreadListItemByIdProvider: FC<
  PropsWithChildren<{
    id: string;
  }>
> = ({ id, children }) => {
  const api = useAssistantApi();

  const api2 = useMemo(() => {
    return {
      threadListItem() {
        return api.threads().item({ id });
      },
      meta: {
        threadListItem: {
          source: "threads",
          query: {
            type: "id",
            id,
          },
        },
      },
    } satisfies Partial<AssistantApi>;
  }, [api, id]);

  return <AssistantApiProvider api={api2}>{children}</AssistantApiProvider>;
};
