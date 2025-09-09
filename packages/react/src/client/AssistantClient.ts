import {
  tapMemo,
  resource,
  Unsubscribe,
  tapInlineResource,
  ResourceElement,
  tapResource,
} from "@assistant-ui/tap";
import { ThreadListClientState } from "./types/ThreadListClient";
import { ThreadListClientActions } from "./types/ThreadListClient";
import { AssistantRuntime } from "../legacy-runtime/runtime/AssistantRuntime";
import { ModelContextProvider } from "../model-context";
import { asStore, Store, tapApi } from "../utils/tap-store";
import { useResource } from "@assistant-ui/tap/react";
import { StoreApi } from "../utils/tap-store/tap-store-api";
import { useMemo } from "react";
import {
  AssistantEventSelector,
  AssistantEvents,
  checkEventScope,
  normalizeEventSelector,
} from "../types/EventTypes";
import { EventManagerClient } from "../legacy-runtime/client/EventManagerRuntimeClient";
import {
  AssistantApi,
  createAssistantApiField,
} from "../context/react/AssistantApiContext";
import { ToolUIClient } from "./ToolUIClient";
import { withEventsProvider } from "./EventContext";
import { ToolUIActions, ToolUIState } from "./types/ToolUI";

type AssistantClientState = {
  readonly threads: ThreadListClientState;
  readonly toolUIs: ToolUIState;
};

type AssistantClientActions = {
  readonly threads: StoreApi<ThreadListClientState, ThreadListClientActions>;
  readonly toolUIs: StoreApi<ToolUIState, ToolUIActions>;

  on<TEvent extends keyof AssistantEvents>(
    event: keyof AssistantEvents,
    callback: (e: AssistantEvents[TEvent]) => void,
  ): Unsubscribe;

  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;

  /** @internal */
  __internal_getRuntime(): AssistantRuntime | null;
};

type AssistantStore = Store<AssistantClientState, AssistantClientActions>;

const AssistantStore = resource(
  ({
    threads,
    registerModelContextProvider,
    __internal_runtime,
  }: AssistantClientProps) => {
    const threadsRes = tapResource(threads, [threads]);

    const events = tapInlineResource(EventManagerClient());
    const toolUIs = withEventsProvider(events, () => {
      return tapInlineResource(ToolUIClient());
    });

    const state = tapMemo<AssistantClientState>(
      () => ({
        threads: threadsRes.state,
        toolUIs: toolUIs.state,
      }),
      [threadsRes.state, toolUIs.state],
    );

    const api = tapApi<AssistantClientState, AssistantClientActions>(state, {
      threads: threadsRes.api,
      registerModelContextProvider: registerModelContextProvider,
      toolUIs: toolUIs.api,
      on: events.on,

      __internal_getRuntime: () => __internal_runtime ?? null,
    });

    return {
      state,
      api,
    };
  },
);

const getClientfromStore = (client: AssistantStore) => {
  const getItem = () => {
    return client.getApi().threads.item("main");
  };
  return {
    threads: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getApi().threads,
    }),
    toolUIs: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getApi().toolUIs,
    }),
    thread: createAssistantApiField({
      source: "threads",
      query: { type: "main" },
      get: () => client.getApi().threads.thread("main"),
    }),
    threadListItem: createAssistantApiField({
      source: "threads",
      query: { type: "main" },
      get: () => getItem(),
    }),
    composer: createAssistantApiField({
      source: "thread",
      query: {},
      get: () => client.getApi().threads.thread("main").composer,
    }),
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
    subscribe: client.subscribe,
    flushSync: client.flushSync,
  } satisfies Partial<AssistantApi>;
};

type AssistantClientProps = {
  threads: ResourceElement<{
    state: ThreadListClientState;
    api: StoreApi<ThreadListClientState, ThreadListClientActions>;
  }>;
  registerModelContextProvider: (provider: ModelContextProvider) => Unsubscribe;

  /** @internal */
  __internal_runtime?: AssistantRuntime;
};

export const useAssistantClient = (props: AssistantClientProps) => {
  const client = useResource(asStore(AssistantStore(props)));
  return useMemo(() => getClientfromStore(client), [client]);
};
