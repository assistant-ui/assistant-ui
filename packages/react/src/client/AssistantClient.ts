import { tapMemo, tapResource, resource } from "@assistant-ui/tap";
import { ThreadListClientState } from "./ThreadListClient";
import { ThreadListClientActions } from "./ThreadListClient";
import { AssistantRuntime } from "../api/AssistantRuntime";
import { ThreadListClient } from "./ThreadListClient";
import { ModelContextProvider } from "../model-context";
import { asStore, Store, tapActions } from "@assistant-ui/react-core";
import { useResource } from "@assistant-ui/tap/react";
import { ThreadClientActions, ThreadClientState } from "./ThreadClient";

export type AssistantClientState = {
  readonly threads: ThreadListClientState;
  readonly thread: ThreadClientState;
};

export type AssistantClientActions = {
  readonly threads: ThreadListClientActions;
  readonly thread: ThreadClientActions;
  readonly registerModelContextProvider: (
    provider: ModelContextProvider,
  ) => void;
};

export type AssistantClient = Store<
  AssistantClientState,
  AssistantClientActions
>;

export const AssistantClient = resource(
  ({ runtime }: { runtime: AssistantRuntime }) => {
    const threads = tapResource(ThreadListClient({ runtime: runtime.threads }));

    const state = tapMemo<AssistantClientState>(() => {
      return {
        threads: threads.state,
        thread: threads.state.main,
      };
    }, [threads.state]);

    const actions = tapActions<AssistantClientActions>({
      threads: threads.actions,
      thread: threads.actions.main,
      registerModelContextProvider: (provider: ModelContextProvider) => {
        runtime.registerModelContextProvider(provider);
      },
    });

    return {
      state,
      actions,
    };
  },
);

export const useAssistantClient = (runtime: AssistantRuntime) => {
  const client = useResource(asStore(AssistantClient)({ runtime: runtime }));
  return client;
};
