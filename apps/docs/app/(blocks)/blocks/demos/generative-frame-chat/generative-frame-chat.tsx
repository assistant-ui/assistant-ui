"use client";

import { Variant, Variants } from "@assistant-ui/variants";
import { TooltipProvider } from "./components/ui";
import { BoardVariant } from "./variants/board";
import { CanvasVariant } from "./variants/canvas";
import { NotebookVariant } from "./variants/notebook";
import { StageVariant } from "./variants/stage";
import { ThreadVariant } from "./variants/thread";
import { WorkspaceVariant } from "./variants/workspace";

/**
 * The chat, in six layouts to choose from. They share the runtime, the
 * scripted replies and the theme, and differ in where a widget is shown.
 */
export function GenerativeFrameChat() {
  return (
    <TooltipProvider>
      <Variants
        id="generative-frame-chat"
        label="Generative frame chat"
        default="thread"
      >
        <Variant id="thread" label="Inline thread">
          <ThreadVariant />
        </Variant>
        <Variant id="canvas" label="Chat and canvas">
          <CanvasVariant />
        </Variant>
        <Variant id="board" label="Widget board">
          <BoardVariant />
        </Variant>
        <Variant id="notebook" label="Notebook">
          <NotebookVariant />
        </Variant>
        <Variant id="stage" label="Stage">
          <StageVariant />
        </Variant>
        <Variant id="workspace" label="Sidebar workspace">
          <WorkspaceVariant />
        </Variant>
      </Variants>
    </TooltipProvider>
  );
}
