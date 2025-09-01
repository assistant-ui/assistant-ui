"use client";

import { FC, PropsWithChildren, memo, useState } from "react";
import { AssistantApiProvider } from "../react/AssistantApiContext";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { AssistantRuntimeCore } from "../../runtimes/core/AssistantRuntimeCore";
import {
  AssistantClient,
  useAssistantClient,
} from "../../client/AssistantClient";
import { createAssistantStoreWithSelector } from "../react/utils/createAssistantStoreWithSelector";
import {
  MessageClientActions,
  MessageClientState,
} from "../../client/MessageClient";
import {
  MessagePartClientActions,
  MessagePartClientState,
} from "../../client/MessagePartClient";
import {
  AttachmentClientActions,
  AttachmentClientState,
} from "../../client/AttachmentClient";

export namespace AssistantProvider {
  export type Props = PropsWithChildren<{
    /**
     * The runtime to provide to the rest of your app.
     */
    runtime: AssistantRuntime;
  }>;
}

const getRenderComponent = (runtime: AssistantRuntime) => {
  return (runtime as { _core?: AssistantRuntimeCore })._core?.RenderComponent;
};

export const AssistantRuntimeProviderImpl: FC<AssistantProvider.Props> = ({
  children,
  runtime,
}) => {
  const assistantClient = useAssistantClient(runtime);

  const RenderComponent = getRenderComponent(runtime);

  return (
    <AssistantProvider client={assistantClient}>
      {RenderComponent && <RenderComponent />}

      {children}
    </AssistantProvider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);

const messageClientProxy = new Proxy(
  {} as MessageClientState & MessageClientActions,
  {
    get() {
      throw new Error(
        "No message context available. You can only access message context inside <ThreadPrimitive.Messages>",
      );
    },
  },
);

const messagePartClientProxy = new Proxy(
  {} as MessagePartClientState & MessagePartClientActions,
  {
    get() {
      throw new Error(
        "No part context available. You can only access part context inside <ThreadPrimitive.Messages>",
      );
    },
  },
);

const attachmentClientProxy = new Proxy(
  {} as AttachmentClientState & AttachmentClientActions,
  {
    get() {
      throw new Error(
        "No attachment context available. You can only access attachment context inside <ThreadPrimitive.Messages>",
      );
    },
  },
);

const AssistantProvider: FC<PropsWithChildren<{ client: AssistantClient }>> = ({
  children,
  client,
}) => {
  const [store] = useState(() => {
    const threadListItemActions = client.actions.threads.item({
      id: client.getState().threads.mainThreadId,
    });
    return createAssistantStoreWithSelector(client, {
      thread: {
        state: (s) => s.threads.main,
        action: (a) => a.threads.main,
      },
      threadListItem: {
        state: (s) => s.threads.threadItems[s.threads.mainThreadId]!,
        action: () => threadListItemActions,
      },
      composer: {
        state: (s) => s.thread.composer,
        action: (a) => a.thread.composer,
      },
      message: {
        state: () => messageClientProxy,
        action: () => messageClientProxy,
      },
      part: {
        state: () => messagePartClientProxy,
        action: () => messagePartClientProxy,
      },
      attachment: {
        state: () => attachmentClientProxy,
        action: () => attachmentClientProxy,
      },
      meta: {
        toolUIs: {
          source: "root",
          query: {},
        },
        threads: {
          source: "root",
          query: {},
        },
        thread: {
          source: "threads",
          query: {
            type: "main",
          },
        },
        threadListItem: {
          source: "threads",
          query: {
            type: "main",
          },
        },
        composer: {
          source: "thread",
          query: {},
        },
      },
    });
  });

  return <AssistantApiProvider client={store}>{children}</AssistantApiProvider>;
};
