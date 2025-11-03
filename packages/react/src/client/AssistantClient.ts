import {
  tapMemo,
  resource,
  Unsubscribe,
  tapInlineResource,
  ResourceElement,
  tapResource,
} from "@assistant-ui/tap";
import { ThreadListClientApi, ThreadListClientState } from "./types/ThreadList";
import { Tools } from "../model-context";
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
  useAssistantApiImpl,
  extendApi,
} from "../context/react/AssistantApiContext";
import { ToolUIClient } from "./ToolUIClient";
import { withEventsProvider } from "./EventContext";
import { withModelContextProvider } from "./ModelContext";
import { withToolUIProvider } from "./ToolUIContext";
import { ToolUIApi, ToolUIState } from "./types/ToolUI";
import { ToolsApi, ToolsState } from "./types/Tools";
import { ModelContextApi, ModelContextState } from "./types/ModelContext";
import { ModelContext as ModelContextResource } from "./ModelContextClient";

type AssistantClientState = {
  readonly threads: ThreadListClientState;
  readonly toolUIs: ToolUIState;
  readonly tools: ToolsState;
  readonly modelContext: ModelContextState;
};

type AssistantClientApi = {
  getState(): AssistantClientState;

  readonly threads: ThreadListClientApi;
  readonly toolUIs: ToolUIApi;
  readonly tools: ToolsApi;
  readonly modelContext: ModelContextApi;

  on<TEvent extends AssistantEvent>(
    event: TEvent,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
};

const AssistantStore = resource(
  ({
    threads: threadsEl,
    modelContext: modelContextEl,
    tools: toolsEl,
  }: AssistantClientProps) => {
    const events = tapInlineResource(EventManager());
    const toolUIsResource = tapInlineResource(ToolUIClient());

    const { threads, toolUIs, tools, modelContext } = withEventsProvider(
      events,
      () => {
        const modelContextResource = tapResource(
          modelContextEl ?? ModelContextResource(),
          [modelContextEl],
        );

        return withModelContextProvider(modelContextResource.api, () => {
          return withToolUIProvider(toolUIsResource.api, () => {
            return {
              toolUIs: toolUIsResource,
              modelContext: modelContextResource,
              tools: tapResource(toolsEl ?? Tools({}), [toolsEl]),
              threads: tapResource(threadsEl, [threadsEl]),
            };
          });
        });
      },
    );

    const state = tapMemo<AssistantClientState>(
      () => ({
        threads: threads.state,
        toolUIs: toolUIs.state,
        tools: tools.state,
        modelContext: modelContext.state,
      }),
      [threads.state, toolUIs.state, tools.state, modelContext.state],
    );

    return tapApi<AssistantClientApi>({
      getState: () => state,

      threads: threads.api,
      toolUIs: toolUIs.api,
      tools: tools.api,
      modelContext: modelContext.api,
      on: events.on,
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
    modelContext: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().api.modelContext,
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
  modelContext?: ResourceElement<{
    state: ModelContextState;
    api: ModelContextApi;
  }>;
  tools?:
    | ResourceElement<{
        state: ToolsState;
        api: ToolsApi;
      }>
    | undefined;
};

export const useAssistantClient = (props: AssistantClientProps) => {
  const api = useAssistantApiImpl();
  const client = useResource(asStore(AssistantStore(props)));
  const clientApi = useMemo(() => getClientFromStore(client), [client]);
  return useMemo(() => extendApi(api, clientApi), [api, clientApi]);
};
