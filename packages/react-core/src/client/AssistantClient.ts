import { Toolkit } from "../tool/toolkit";
import { BaseThread } from "./BaseThread";
import { ResourceElement, tapMemo, tapResource } from "@assistant-ui/tap";
import { Store, store, tapActions } from "../utils/tap-store";
import { AssistantState, AssistantActions } from "./types/assistant-types";

export namespace AssistantClient {
  export type Config = {
    readonly thread: ResourceElement<BaseThread.Result>;
    readonly toolkit?: Toolkit;
  };
}

export type AssistantClient = Store<AssistantState, AssistantActions>;

export const AssistantClient = store((config: AssistantClient.Config) => {
  const thread = tapResource(config.thread);

  const state = tapMemo<AssistantState>(
    () => ({
      toolkit: config.toolkit ?? Toolkit.EMPTY,
      thread: thread.state,
      composer: thread.state.composer,
    }),
    [config.toolkit, thread.state]
  );

  const actions = tapActions<AssistantActions>({
    thread: thread.actions,
    composer: thread.actions.composer,
  });

  return {
    state,
    actions,
  };
});
