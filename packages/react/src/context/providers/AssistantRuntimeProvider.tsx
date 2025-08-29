"use client";

import { FC, PropsWithChildren, memo, useState } from "react";
import { AssistantStoreContext } from "../react/AssistantContext";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { AssistantRuntimeCore } from "../../runtimes/core/AssistantRuntimeCore";
import {
  AssistantClient,
  useAssistantClient,
} from "../../client/AssistantClient";
import { ThreadViewportProvider } from "./ThreadViewportProvider";
import { createAssistantStoreWithSelector } from "../react/utils/createAssistantStoreWithSelector";
import { MessageClientActions } from "../../client/MessageClient";
import { MessagePartClientActions } from "../../client/MessagePartClient";
import { AttachmentClientActions } from "../../client/AttachmentClient";

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

const AssistantProvider: FC<PropsWithChildren<{ client: AssistantClient }>> = ({
  children,
  client,
}) => {
  const [store] = useState(() => {
    const threadListItemActions = client.actions.threads.item(
      client.getState().threads.mainThreadId,
    );
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
        state: () => {
          throw new Error(
            "No message context available. You can only access message context inside <ThreadPrimitive.Messages>",
          );
        },
        action: () => {
          return new Proxy({} as MessageClientActions, {
            get() {
              throw new Error(
                "No message context available. You can only access message context inside <ThreadPrimitive.Messages>",
              );
            },
          });
        },
      },
      part: {
        state: () => {
          throw new Error(
            "No part context available. You can only access part context inside <ThreadPrimitive.Messages>",
          );
        },
        action: () => {
          return new Proxy({} as MessagePartClientActions, {
            get() {
              throw new Error(
                "No part context available. You can only access part context inside <ThreadPrimitive.Messages>",
              );
            },
          });
        },
      },
      attachment: {
        state: () => {
          throw new Error(
            "No attachment context available. You can only access attachment context inside <ThreadPrimitive.Messages>",
          );
        },
        action: () => {
          return new Proxy({} as AttachmentClientActions, {
            get() {
              throw new Error(
                "No attachment context available. You can only access attachment context inside <ThreadPrimitive.Messages>",
              );
            },
          });
        },
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

  return (
    <AssistantStoreContext value={store}>
      {/* TODO temporarily allow accessing viewport state from outside the viewport */}
      {/* TODO figure out if this behavior should be deprecated, since it is quite hacky */}
      <ThreadViewportProvider>{children}</ThreadViewportProvider>
    </AssistantStoreContext>
  );
};
