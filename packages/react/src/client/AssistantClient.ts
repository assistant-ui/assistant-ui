import { tapMemo, tapResource, resource } from "@assistant-ui/tap";
import { ThreadListClientState } from "./ThreadListClient";
import { ThreadListClientActions } from "./ThreadListClient";
import { AssistantRuntimeCore } from "../runtimes/core/AssistantRuntimeCore";
import { AssistantRuntimeImpl } from "../api/AssistantRuntime";
import { ThreadListClient } from "./ThreadListClient";
import { tapState } from "@assistant-ui/tap";
import { ModelContextProvider } from "../model-context";
import { tapActions } from "@assistant-ui/react-core";
import { ThreadClientActions, ThreadClientState } from "./ThreadClient";

type AssistantClientState = {
  readonly threads: ThreadListClientState;
  readonly thread: ThreadClientState;
};

type AssistantClientActions = {
  readonly threads: ThreadListClientActions;
  readonly thread: ThreadClientActions;
  readonly registerModelContextProvider: (
    provider: ModelContextProvider,
  ) => void;
};

export const LegacyAssistantClient = resource(
  ({ core }: { core: AssistantRuntimeCore }) => {
    const [runtime] = tapState(new AssistantRuntimeImpl(core));

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
