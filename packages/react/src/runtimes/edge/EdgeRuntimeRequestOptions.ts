import { JSONSchema7 } from "json-schema";
import { CoreThreadMessage } from "../../types";
import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";

export type EdgeRuntimeRequestOptions = {
  system?: string | undefined;
  messages: CoreThreadMessage[];
  tools: LanguageModelV1FunctionTool[];
};
