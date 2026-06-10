"use generative";

import { defineToolkit, externalTool } from "@assistant-ui/react";
import {
  ApplyPatchTool,
  AskQuestionTool,
  BashTool,
  EditTool,
  GlobTool,
  GrepTool,
  ReadTool,
  WebFetchTool,
  WebSearchTool,
  WriteTool,
} from "./opencode-tools";

export default defineToolkit({
  read: { execute: externalTool(), render: ReadTool },
  edit: { execute: externalTool(), render: EditTool },
  write: { execute: externalTool(), render: WriteTool },
  bash: { execute: externalTool(), render: BashTool },
  grep: { execute: externalTool(), render: GrepTool },
  glob: { execute: externalTool(), render: GlobTool },
  webSearch: { execute: externalTool(), render: WebSearchTool },
  webFetch: { execute: externalTool(), render: WebFetchTool },
  apply_patch: { execute: externalTool(), render: ApplyPatchTool },
  ask_question: { execute: externalTool(), render: AskQuestionTool },
  request_user_input: { execute: externalTool(), render: AskQuestionTool },
  requestUserInput: { execute: externalTool(), render: AskQuestionTool },
});
