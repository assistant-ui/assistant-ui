import { tapActions } from "../utils/tap-store";
import { StateWithActions } from "./types/common-types";
import { DefaultComposer } from "./DefaultComposer";
import {
  ThreadState,
  SendInput,
  UICommand,
  ThreadActions,
} from "./types/thread-types";
import {
  resource,
  ResourceElement,
  tapMemo,
  tapResource,
} from "@assistant-ui/tap";
import { ComposerActions, ComposerState } from "./types/composer-types";

export namespace BaseThread {
  export type Props = {
    state: Omit<ThreadState, "composer" | "editComposers">;
    onDispatch: (commands: readonly UICommand[]) => void;
    composer?: ResourceElement<
      StateWithActions<ComposerState, ComposerActions>
    >;
  };
  export type Result = StateWithActions<ThreadState, ThreadActions>;
}

export const BaseThread = resource(
  (config: BaseThread.Props): BaseThread.Result => {
    const composer = config.composer
      ? tapResource(config.composer)
      : tapResource(
          DefaultComposer({
            get threadActions(): ThreadActions {
              return actions;
            },
          }),
          [],
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
        editComposers: {},
      };
    }, [config.state, composer.state]);

    return {
      state,
      actions,
    };
  },
);
