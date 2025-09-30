import {
  tapMemo,
  resource,
  Unsubscribe,
  tapInlineResource,
  ResourceElement,
  tapResource,
} from "@assistant-ui/tap";
import { ThreadListClientApi, ThreadListClientState } from "./types/ThreadList";
import { AssistantRuntime } from "../legacy-runtime/runtime/AssistantRuntime";
import { ModelContextProvider } from "../model-context";
import { asStore, Store, tapApi } from "../utils/tap-store";
import { useResource } from "@assistant-ui/tap/react";
import { useMemo } from "react";
import {
  AssistantEvent,
  AssistantEventCallback,
  checkEventScope,
  normalizeEventSelector,
} from "../types/EventTypes";
import { EventManager } from "../legacy-runtime/client/EventManagerRuntimeClient";
import {
  AssistantApi,
  createAssistantApiField,
} from "../context/react/AssistantApiContext";
import { ToolUIClient } from "./ToolUIClient";
import { withEventsProvider } from "./EventContext";
import { ToolUIApi, ToolUIState } from "./types/ToolUI";

type AssistantClientState = {
  readonly threads: ThreadListClientState;
  readonly toolUIs: ToolUIState;
};

type AssistantClientApi = {
  getState(): AssistantClientState;

  readonly threads: ThreadListClientApi;
  readonly toolUIs: ToolUIApi;

  on<TEvent extends AssistantEvent>(
    event: TEvent,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;

  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;

  /** @internal */
  __internal_getRuntime?(): AssistantRuntime;
};

const AssistantStore = resource(
  ({
    threads: threadsEl,
    registerModelContextProvider,
    __internal_runtime,
  }: AssistantClientProps) => {
    const events = tapInlineResource(EventManager());

    const { threads, toolUIs } = withEventsProvider(events, () => {
      return {
        toolUIs: tapInlineResource(ToolUIClient()),
        threads: tapResource(threadsEl, [threadsEl]),
      };
    });

    const state = tapMemo<AssistantClientState>(
      () => ({
        threads: threads.state,
        toolUIs: toolUIs.state,
      }),
      [threads.state, toolUIs.state],
    );

    return tapApi<AssistantClientApi>({
      getState: () => state,

      threads: threads.api,
      toolUIs: toolUIs.api,
      on: events.on,

      registerModelContextProvider:
        registerModelContextProvider ?? (() => () => {}),
      ...(__internal_runtime && {
        __internal_getRuntime: () => __internal_runtime,
      }),
    });
  },
);

const getClientFromStore = (client: Store<{ api: AssistantClientApi }>) => {
  const getItem = () => {
    return client.getState().api.threads.item("main");
  };
  return {
    threads: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().api.threads,
    }),
    toolUIs: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().api.toolUIs,
    }),
    thread: createAssistantApiField({
      source: "threads",
      query: { type: "main" },
      get: () => client.getState().api.threads.thread("main"),
    }),
    threadListItem: createAssistantApiField({
      source: "threads",
      query: { type: "main" },
      get: () => getItem(),
    }),
    composer: createAssistantApiField({
      source: "thread",
      query: {},
      get: () => client.getState().api.threads.thread("main").composer,
    }),
    registerModelContextProvider(provider: ModelContextProvider) {
      return client.getState().api.registerModelContextProvider(provider);
    },
    ...(client.getState().api.__internal_getRuntime && {
      __internal_getRuntime() {
        return client.getState().api.__internal_getRuntime!();
      },
    }),
    on(selector, callback) {
      const { event, scope } = normalizeEventSelector(selector);
      if (scope === "*") return client.getState().api.on(event, callback);

      if (
        checkEventScope("thread", scope, event) ||
        checkEventScope("thread-list-item", scope, event) ||
        checkEventScope("composer", scope, event)
      ) {
        return client.getState().api.on(event, (e) => {
          if (e.threadId !== getItem().getState().id) return;
          callback(e);
        });
      }

      throw new Error(
        `Event scope is not available in this component: ${scope}`,
      );
    },
    subscribe: client.subscribe,
    flushSync: client.flushSync,
  } satisfies Partial<AssistantApi>;
};

export type AssistantClientProps = {
  threads: ResourceElement<{
    state: ThreadListClientState;
    api: ThreadListClientApi;
  }>;
  registerModelContextProvider?: (
    provider: ModelContextProvider,
  ) => Unsubscribe;

  /** @internal */
  __internal_runtime?: AssistantRuntime;
};

export const useAssistantClient = (props: AssistantClientProps) => {
  const client = useResource(asStore(AssistantStore(props)));
  return useMemo(() => getClientFromStore(client), [client]);
};
