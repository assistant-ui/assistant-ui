import { CoreMessage } from "../../types";
import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";

export type EdgeRuntimeRequestOptions = {
  system?: string | undefined;
  messages: CoreMessage[];
  tools: LanguageModelV1FunctionTool[];
};
