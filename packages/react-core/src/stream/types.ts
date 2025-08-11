import { ReadonlyJSONValue } from "../utils/json-types";

export type AssistantStreamOperation =
  | {
      readonly type: "set";
      readonly path: readonly string[];
      readonly value: ReadonlyJSONValue;
    }
  | {
      readonly type: "append-text";
      readonly path: readonly string[];
      readonly value: string;
    };

export type AssistantStreamChunk<TState = ReadonlyJSONValue> = {
  readonly snapshot: TState;
  readonly operations: readonly AssistantStreamOperation[];
};
