import type {
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "../AssistantTypes";
import type { PartMethods, PartState } from "./part";

export type ChainOfThoughtPart = Extract<
  PartState,
  { type: "tool-call" } | { type: "reasoning" }
>;

export type ChainOfThoughtState = {
  readonly parts: readonly ChainOfThoughtPart[];
  readonly collapsed: boolean;
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

export type ChainOfThoughtMethods = {
  /**
   * Get the current state of the chain of thought.
   */
  getState(): ChainOfThoughtState;
  /**
   * Set the collapsed state of the chain of thought accordion.
   */
  setCollapsed(collapsed: boolean): void;
  /**
   * Get the part methods for a specific part within this chain of thought.
   */
  part(selector: { index: number }): PartMethods;
};

export type ChainOfThoughtMeta = {
  source: "message";
  query: { type: "chainOfThought" };
};

export type ChainOfThoughtClientSchema = {
  state: ChainOfThoughtState;
  methods: ChainOfThoughtMethods;
  meta: ChainOfThoughtMeta;
};
