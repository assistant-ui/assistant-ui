import { tapMemo, tapResource, resource, tapState } from "@assistant-ui/tap";
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

  readonly registerModelContextProvider: (
    provider: ModelContextProvider,
  ) => void;

  readonly toolUIs: AssistantToolUIActions;
};

export type AssistantClient = Store<
  AssistantClientState,
  AssistantClientActions
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
        runtime.registerModelContextProvider(provider);
      },
      toolUIs: toolUIs.actions,
    });

    return {
      state,
      actions,
    };
  },
);

export const useAssistantClient = (runtime: AssistantRuntime) => {
  const client = useResource(asStore(AssistantClient({ runtime: runtime })));
  return client;
};
