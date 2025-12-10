import {
  tapMemo,
  resource,
  tapInlineResource,
  ResourceElement,
  tapResource,
} from "@assistant-ui/tap";
import { type ClientOutput } from "@assistant-ui/store";
import {
  ThreadsState,
  ThreadsMethods,
  ToolsState,
  ToolsMethods,
  ModelContextState,
  ModelContextMethods,
} from "../types/scopes";
import { Tools } from "../model-context";
import { asStore, Store } from "../utils/tap-store";
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
import { withEventsProvider } from "./EventContext";
import { withModelContextProvider } from "./ModelContext";
import { ModelContext as ModelContextResource } from "./ModelContextClient";
import { Unsubscribe } from "../types";

type AssistantClientState = {
  readonly threads: ThreadsState;
  readonly tools: ToolsState;
  readonly modelContext: ModelContextState;
};

type AssistantClientMethods = {
  getState(): AssistantClientState;

  readonly threads: ThreadsMethods;
  readonly tools: ToolsMethods;
  readonly modelContext: ModelContextMethods;

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
  }: AssistantClientProps): {
    state: AssistantClientState;
    methods: AssistantClientMethods;
  } => {
    const events = tapInlineResource(EventManager());

    const { threads, tools, modelContext } = withEventsProvider(events, () => {
      const modelContextResource = tapResource(
        modelContextEl ?? ModelContextResource(),
        [modelContextEl],
      );

      return withModelContextProvider(modelContextResource.methods, () => {
        return {
          modelContext: modelContextResource,
          tools: tapResource(toolsEl ?? Tools({}), [toolsEl]),
          threads: tapResource(threadsEl, [threadsEl]),
        };
      });
    });

    const state = tapMemo<AssistantClientState>(
      () => ({
        threads: threads.state,
        tools: tools.state,
        modelContext: modelContext.state,
      }),
      [threads.state, tools.state, modelContext.state],
    );

    return {
      state,
      methods: {
        getState: () => state,
        threads: threads.methods,
        tools: tools.methods,
        modelContext: modelContext.methods,
        on: events.on,
      },
    };
  },
);

const getClientFromStore = (
  client: Store<{ methods: AssistantClientMethods }>,
) => {
  const getItem = () => {
    return client.getState().methods.threads.item("main");
  };
  return {
    threads: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().methods.threads,
    }),
    tools: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().methods.tools,
    }),
    modelContext: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().methods.modelContext,
    }),
    thread: createAssistantApiField({
      source: "threads",
      query: { type: "main" },
      get: () => client.getState().methods.threads.thread("main"),
    }),
    threadListItem: createAssistantApiField({
      source: "threads",
      query: { type: "main" },
      get: () => getItem(),
    }),
    composer: createAssistantApiField({
      source: "thread",
      query: {},
      get: () => client.getState().methods.threads.thread("main").composer,
    }),
    on(selector, callback) {
      const { event, scope } = normalizeEventSelector(selector);
      if (scope === "*") return client.getState().methods.on(event, callback);

      if (
        checkEventScope("thread", scope, event) ||
        checkEventScope("thread-list-item", scope, event) ||
        checkEventScope("composer", scope, event)
      ) {
        return client.getState().methods.on(event, (e) => {
          if (e.threadId !== getItem().getState().id) return;
          callback(e);
        });
      }

      throw new Error(
        `Event scope is not available in this component: ${scope}`,
      );
    },
    subscribe: client.subscribe,
  } satisfies Partial<AssistantApi>;
};

export type AssistantClientProps = {
  threads: ResourceElement<ClientOutput<"threads">>;
  modelContext?: ResourceElement<ClientOutput<"modelContext">>;
  tools?: ResourceElement<ClientOutput<"tools">> | undefined;
};

export const useAssistantClient = (props: AssistantClientProps) => {
  const api = useAssistantApiImpl();
  const client = useResource(asStore(AssistantStore(props)));
  const clientApi = useMemo(() => getClientFromStore(client), [client]);
  return useMemo(() => extendApi(api, clientApi), [api, clientApi]);
};
