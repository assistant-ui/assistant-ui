import { resource, tapState, tapMemo } from "@assistant-ui/tap";
import { ComposerState, ComposerActions } from "./types/composer-types";
import { StateWithActions } from "./types/common-types";
import { ThreadActions } from "./types/thread-types";
import { tapActions } from "../utils/tap-store";

export namespace DefaultComposer {
  export type Props = {
    threadActions: ThreadActions;
  };

  export type Result = StateWithActions<ComposerState, ComposerActions>;
}

export const DefaultComposer = resource(
  (config: DefaultComposer.Props): DefaultComposer.Result => {
    const [text, setText] = tapState("");

    const state = tapMemo(() => ({ text }), [text]);

    const actions = tapActions({
      setText,
      send: () => {
        if (text.trim()) {
          config.threadActions.send({
            role: "user",
            parts: [{ type: "text", text }],
          });
          setText("");
        }
      },
    });

    return {
      state,
      actions,
    };
  }
);
