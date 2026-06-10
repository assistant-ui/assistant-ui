"use client";

import {
  AskQuestionInline,
  withOpenCodeToolInteractions,
} from "./opencode-tool-interactions";
import { ApplyPatchDiff } from "./tool-ui-apply-patch";
import { BashTerminal } from "./tool-ui-bash";
import {
  EditInline,
  GlobInline,
  GrepInline,
  ReadInline,
  ToolCallFallback,
  WebFetchInline,
  WebSearchInline,
  WriteInline,
} from "./tool-ui-inline";

export const ReadTool = withOpenCodeToolInteractions(ReadInline);
export const EditTool = withOpenCodeToolInteractions(EditInline);
export const WriteTool = withOpenCodeToolInteractions(WriteInline);
export const BashTool = withOpenCodeToolInteractions(BashTerminal);
export const GrepTool = withOpenCodeToolInteractions(GrepInline);
export const GlobTool = withOpenCodeToolInteractions(GlobInline);
export const WebSearchTool = withOpenCodeToolInteractions(WebSearchInline);
export const WebFetchTool = withOpenCodeToolInteractions(WebFetchInline);
export const ApplyPatchTool = withOpenCodeToolInteractions(ApplyPatchDiff);
export const AskQuestionTool = withOpenCodeToolInteractions(AskQuestionInline);
export const FallbackTool = withOpenCodeToolInteractions(ToolCallFallback);
