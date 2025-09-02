import {
  tapMemo,
  resource,
  tapState,
  Unsubscribe,
  tapInlineResource,
} from "@assistant-ui/tap";
import { ThreadListClientState } from "./ThreadListClient";
import { ThreadListClientActions } from "./ThreadListClient";
import { AssistantRuntime } from "../api/AssistantRuntime";
import { ThreadListClient } from "./ThreadListClient";
import { ModelContextProvider } from "../model-context";
import { asStore, Store, tapApi } from "../utils/tap-store";
import { useResource } from "@assistant-ui/tap/react";
import { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import { StoreApi } from "../utils/tap-store/tap-store-api";
import { useMemo } from "react";

export type AssistantToolUIState = Record<string, ToolCallMessagePartComponent>;
export type AssistantToolUIActions = {
  setToolUI(toolName: string, render: ToolCallMessagePartComponent): void;
};

export const AssistantToolUIClient = resource(() => {
  const [state, setState] = tapState<AssistantToolUIState>(() => ({}));

  const api = tapApi<AssistantToolUIState, AssistantToolUIActions>(state, {
    setToolUI: (toolName, render) => {
      setState((prev) => {
        return {
          ...prev,
          [toolName]: render,
        };
      });
    },
  });

  return {
    state,
    api,
  };
});

export type AssistantClientState = {
  readonly threads: ThreadListClientState;
  readonly toolUIs: AssistantToolUIState;
};

export type AssistantClientActions = {
  readonly threads: StoreApi<ThreadListClientState, ThreadListClientActions>;

  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;

  readonly toolUIs: StoreApi<AssistantToolUIState, AssistantToolUIActions>;

  __internal_getRuntime(): AssistantRuntime | null;
};

export type AssistantClient = Store<
  AssistantClientState,
  AssistantClientActions
>;

export const AssistantClient = resource(
  ({ runtime }: { runtime: AssistantRuntime }) => {
    const threads = tapInlineResource(
      ThreadListClient({ runtime: runtime.threads }),
    );
    const toolUIs = tapInlineResource(AssistantToolUIClient());

    const state = tapMemo<AssistantClientState>(() => {
      return {
        threads: threads.state,
        toolUIs: toolUIs.state,
      };
    }, [threads.state, toolUIs.state]);

    const api = tapApi<AssistantClientState, AssistantClientActions>(state, {
      threads: threads.api,
      registerModelContextProvider: (provider: ModelContextProvider) => {
        return runtime.registerModelContextProvider(provider);
      },
      toolUIs: toolUIs.api,

      __internal_getRuntime: () => runtime,
    });

    return {
      state,
      api,
    };
  },
);

export const useAssistantClient = (runtime: AssistantRuntime) => {
  const client = useResource(asStore(AssistantClient({ runtime: runtime })));
  const api = useMemo(() => {
    return {
      threads() {
        return client.getApi().threads;
      },
      toolUIs() {
        return client.getApi().toolUIs;
      },
      thread() {
        return client.getApi().threads.thread("main");
      },
      threadListItem() {
        return client.getApi().threads.item({
          id: client.getApi().threads.getState().mainThreadId,
        });
      },
      composer() {
        return client.getApi().threads.thread("main").composer;
      },
      registerModelContextProvider(provider: ModelContextProvider) {
        return client.getApi().registerModelContextProvider(provider);
      },
      __internal_getRuntime() {
        return client.getApi().__internal_getRuntime();
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
      } as const,
      subscribe: client.subscribe,
      flushSync: client.flushSync,
    };
  }, [client]);

  return api;
};
