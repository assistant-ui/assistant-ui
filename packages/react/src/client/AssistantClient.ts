import {
  tapMemo,
  tapResource,
  resource,
  tapState,
  Unsubscribe,
} from "@assistant-ui/tap";
import { ThreadListClientState } from "./ThreadListClient";
import { ThreadListClientActions } from "./ThreadListClient";
import { AssistantRuntime } from "../api/AssistantRuntime";
import { ThreadListClient } from "./ThreadListClient";
import { ModelContextProvider } from "../model-context";
import { asStore, Store, tapActions } from "../utils/tap-store";
import { useResource } from "@assistant-ui/tap/react";
import { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

export type AssistantToolUIState = Record<string, ToolCallMessagePartComponent>;
export type AssistantToolUIActions = {
  setToolUI(toolName: string, render: ToolCallMessagePartComponent): void;
};

export const AssistantToolUIClient = resource(() => {
  const [state, setState] = tapState<AssistantToolUIState>(() => ({}));

  const actions = tapActions<AssistantToolUIActions>({
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
    actions,
  };
});

export type AssistantClientState = {
  readonly threads: ThreadListClientState;
  readonly toolUIs: AssistantToolUIState;
};

export type AssistantClientActions = {
  readonly threads: ThreadListClientActions;

  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;

  readonly toolUIs: AssistantToolUIActions;

  __internal_getRuntime(): AssistantRuntime | null;
};

export type AssistantClientMeta = {
  readonly threads: { source: "root"; query: Record<string, never> };
  readonly toolUIs: { source: "root"; query: Record<string, never> };
};

export type AssistantClient = Store<
  AssistantClientState,
  AssistantClientActions,
  AssistantClientMeta
>;

export const AssistantClient = resource(
  ({ runtime }: { runtime: AssistantRuntime }) => {
    const threads = tapResource(ThreadListClient({ runtime: runtime.threads }));
    const toolUIs = tapResource(AssistantToolUIClient());

    const state = tapMemo<AssistantClientState>(() => {
      return {
        threads: threads.state,
        toolUIs: toolUIs.state,
      };
    }, [threads.state, toolUIs.state]);

    const actions = tapActions<AssistantClientActions>({
      threads: threads.actions,
      registerModelContextProvider: (provider: ModelContextProvider) => {
        return runtime.registerModelContextProvider(provider);
      },
      toolUIs: toolUIs.actions,

      __internal_getRuntime: () => runtime,
    });

    return {
      state,
      actions,
      meta: {
        threads: { source: "root", query: {} },
        toolUIs: { source: "root", query: {} },
      } satisfies AssistantClientMeta,
    };
  },
);

export const useAssistantClient = (runtime: AssistantRuntime) => {
  const client = useResource(asStore(AssistantClient({ runtime: runtime })));
  return client;
};
