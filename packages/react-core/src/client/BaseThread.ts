import { tapActions } from "../utils/tap-store";
import { StateWithActions } from "./types/common-types";
import { DefaultComposer } from "./DefaultComposer";
import {
  ThreadState,
  SendInput,
  UICommand,
  ThreadActions,
} from "./types/thread-types";
import { resource, tapMemo, tapResource } from "@assistant-ui/tap";

export namespace BaseThread {
  export type Props = {
    state: Omit<ThreadState, "composer">;
    onDispatch: (commands: readonly UICommand[]) => void;
  };
  export type Result = StateWithActions<ThreadState, ThreadActions>;
}

export const BaseThread = resource(
  (config: BaseThread.Props): BaseThread.Result => {
    const composer = tapResource(
      DefaultComposer({
        get threadActions(): ThreadActions {
          return actions;
        },
      }),
      []
    );

    const actions = tapActions<ThreadActions>({
      composer: composer.actions,
      dispatch: config.onDispatch,
      send: (input: SendInput) => {
        const commands: UICommand[] =
          typeof input === "string"
            ? ([
                {
                  type: "add-message",
                  message: {
                    role: "user",
                    parts: [{ type: "text", text: input }],
                  },
                },
              ] as const)
            : ([
                {
                  type: "add-message",
                  message: input,
                },
              ] as const);

        config.onDispatch(commands);
      },
      cancel: () => {
        config.onDispatch([{ type: "cancel" }]);
      },
    });

    const state = tapMemo(() => {
      return {
        ...config.state,
        composer: composer.state,
      };
    }, [config.state, composer.state]);

    return {
      state,
      actions,
    };
  }
);
