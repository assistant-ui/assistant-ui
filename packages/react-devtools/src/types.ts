import type { NormalizedTool } from "./utils/toolNormalization";

export interface SerializedModelContext {
  system?: string;
  tools?: NormalizedTool[];
  callSettings?: Record<string, unknown>;
  config?: Record<string, unknown>;
}
