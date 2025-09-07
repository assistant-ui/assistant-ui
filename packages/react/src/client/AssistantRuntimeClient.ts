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
import {
  AssistantEventSelector,
  AssistantEvents,
  checkEventScope,
  normalizeEventSelector,
} from "../types/EventTypes";
import { EventManagerClient } from "./EventManagerClient";

export type AssistantToolUIState = Record<
  string,
  ToolCallMessagePartComponent[]
>;
export type AssistantToolUIActions = {
  setToolUI(
    toolName: string,
    render: ToolCallMessagePartComponent,
  ): Unsubscribe;
};

export const AssistantToolUIClient = resource(() => {
  const [state, setState] = tapState<AssistantToolUIState>(() => ({}));

  const api = tapApi<AssistantToolUIState, AssistantToolUIActions>(state, {
    setToolUI: (toolName, render) => {
      setState((prev) => {
        return {
          ...prev,
          [toolName]: [...(prev[toolName] ?? []), render],
        };
      });

      return () => {
        setState((prev) => {
          return {
            ...prev,
            [toolName]: prev[toolName]?.filter((r) => r !== render) ?? [],
          };
        });
      };
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
  readonly toolUIs: StoreApi<AssistantToolUIState, AssistantToolUIActions>;

  on<TEvent extends keyof AssistantEvents>(
    event: keyof AssistantEvents,
    callback: (e: AssistantEvents[TEvent]) => void,
  ): Unsubscribe;

  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;
  /** @internal */
  __internal_getRuntime(): AssistantRuntime | null;
};

export type AssistantClient = Store<
  AssistantClientState,
  AssistantClientActions
>;

export const AssistantClient = resource(
  ({ runtime }: { runtime: AssistantRuntime }) => {
    const events = tapInlineResource(EventManagerClient());

    const threads = tapInlineResource(
      ThreadListClient({
        runtime: runtime.threads,
        events,
      }),
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
      on: events.on,

      __internal_getRuntime: () => runtime,
    });

    return {
      state,
      api,
    };
  },
);

export const useAssistantRuntimeClient = (runtime: AssistantRuntime) => {
  const client = useResource(asStore(AssistantClient({ runtime: runtime })));
  const api = useMemo(() => {
    const getItem = () => {
      return client.getApi().threads.item("main");
    };
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
        return getItem();
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
      on<TEvent extends keyof AssistantEvents>(
        selector: AssistantEventSelector<TEvent>,
        callback: (e: AssistantEvents[TEvent]) => void,
      ): Unsubscribe {
        const { event, scope } = normalizeEventSelector(selector);
        if (scope === "*") return client.getApi().on(event, callback);

        if (
          checkEventScope("thread", scope, event) ||
          checkEventScope("thread-list-item", scope, event) ||
          checkEventScope("composer", scope, event)
        ) {
          return client.getApi().on(event, (e) => {
            if (e.threadId !== getItem().getState().id) return;
            callback(e);
          });
        }

        throw new Error(
          `Event scope is not available in this component: ${scope}`,
        );
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
