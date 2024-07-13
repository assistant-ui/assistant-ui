import { CoreMessage } from "../../types";
import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";

export type LanguageModelConfig = {
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  modelName?: string | undefined;
};

export type EdgeRuntimeRequestOptions = LanguageModelConfig & {
  system?: string | undefined;
  messages: CoreMessage[];
  tools: LanguageModelV1FunctionTool[];
};
