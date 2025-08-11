import { Toolkit } from "../../tool/toolkit";
import { ComposerActions, ComposerState } from "./composer-types";
import { ThreadActions, ThreadState } from "./thread-types";

export type AssistantActions = {
  thread: ThreadActions;
  composer: ComposerActions;
};

export type AssistantState = {
  readonly toolkit: Toolkit;
  readonly thread: ThreadState;
  readonly composer: ComposerState;
};
