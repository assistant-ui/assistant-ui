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
import { ModelContextProvider, Tools } from "../model-context";
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
import {
  withModelContextProvider,
  type ModelContextRegistrar,
} from "./ModelContext";
import { withToolUIProvider } from "./ToolUIContext";
import { ToolUIApi, ToolUIState } from "./types/ToolUI";
import { ToolsApi, ToolsState } from "./types/Tools";

type AssistantClientState = {
  readonly threads: ThreadListClientState;
  readonly toolUIs: ToolUIState;
  readonly tools: ToolsState;
};

type AssistantClientApi = {
  getState(): AssistantClientState;

  readonly threads: ThreadListClientApi;
  readonly toolUIs: ToolUIApi;
  readonly tools: ToolsApi;

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
    tools: toolsEl,
    registerModelContextProvider,
    __internal_runtime,
  }: AssistantClientProps) => {
    const events = tapInlineResource(EventManager());
    const toolUIsResource = tapInlineResource(ToolUIClient());

    const modelContextRegistrar: ModelContextRegistrar = tapMemo(
      () => ({
        registerModelContextProvider:
          registerModelContextProvider ?? (() => () => {}),
      }),
      [registerModelContextProvider],
    );

    const { threads, toolUIs, tools } = withEventsProvider(events, () => {
      return withModelContextProvider(modelContextRegistrar, () => {
        return withToolUIProvider(toolUIsResource.api, () => {
          return {
            toolUIs: toolUIsResource,
            tools: tapResource(toolsEl ?? Tools({}), [toolsEl]),
            threads: tapResource(threadsEl, [threadsEl]),
          };
        });
      });
    });

    const state = tapMemo<AssistantClientState>(
      () => ({
        threads: threads.state,
        toolUIs: toolUIs.state,
        tools: tools.state,
      }),
      [threads.state, toolUIs.state, tools.state],
    );

    return tapApi<AssistantClientApi>({
      getState: () => state,

      threads: threads.api,
      toolUIs: toolUIs.api,
      tools: tools.api,
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
    tools: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().api.tools,
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
  tools?:
    | ResourceElement<{
        state: ToolsState;
        api: ToolsApi;
      }>
    | undefined;
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
