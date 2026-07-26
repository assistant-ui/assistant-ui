import type { ReadonlyJSONValue } from "../../utils";

export type AssistantTransportStateOperation =
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

export type GorpStreamOperation = AssistantTransportStateOperation;

export type GorpStreamChunk = {
  readonly snapshot: ReadonlyJSONValue;
  readonly operations: readonly GorpStreamOperation[];
};
