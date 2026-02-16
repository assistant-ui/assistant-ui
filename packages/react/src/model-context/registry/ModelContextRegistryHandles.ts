import type { AssistantToolProps } from "../../model-context/AssistantToolTypes";
import type { AssistantInstructionsConfig } from "../../model-context/AssistantToolTypes";

export interface ModelContextRegistryToolHandle<
  TArgs extends Record<string, unknown> = any,
  TResult = any,
> {
  update(tool: AssistantToolProps<TArgs, TResult>): void;
  remove(): void;
}

export interface ModelContextRegistryInstructionHandle {
  update(config: string | AssistantInstructionsConfig): void;
  remove(): void;
}

export interface ModelContextRegistryProviderHandle {
  remove(): void;
}
