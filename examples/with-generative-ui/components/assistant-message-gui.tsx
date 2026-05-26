"use client";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/tool-group";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  UnknownComponentFallback,
  componentsAllowlist,
} from "@/components/gui";
import {
  RENDER_GUI_TOOL_NAME,
  isLeakedRenderGuiText,
  parseRenderGuiResult,
} from "@/lib/render-gui-tool";
import { cn } from "@/lib/utils";
import type { GenerativeUISpec } from "@assistant-ui/react";
import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ErrorPrimitive,
  getMcpAppFromToolPart,
  MessagePrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  RefreshCwIcon,
} from "lucide-react";
import { type FC, useEffect, useRef } from "react";

type AssistantMessageGuiProps = {
  /** Set false in dev to surface the dropped-bridge warning. */
  bridgeEnabled?: boolean;
};

const AllowlistedGenerativeUI = ({ spec }: { spec?: GenerativeUISpec }) => (
  <MessagePrimitive.GenerativeUI
    spec={spec}
    components={componentsAllowlist}
    Fallback={UnknownComponentFallback}
  />
);

const useDroppedGenerativeUIWarning = (bridgeEnabled: boolean) => {
  const content = useAuiState((s) => s.message.content);
  const warned = useRef(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" ||
      bridgeEnabled ||
      warned.current
    ) {
      return;
    }

    const hasRenderGui = content.some(
      (part) =>
        part.type === "tool-call" &&
        part.toolName === RENDER_GUI_TOOL_NAME &&
        part.result != null &&
        parseRenderGuiResult(part.result) != null,
    );

    const hasUnhandledGenerativeUI = content.some(
      (part) => part.type === "generative-ui",
    );

    if (hasRenderGui || hasUnhandledGenerativeUI) {
      warned.current = true;
      console.warn(
        "[generative-ui] Message contains render_gui or generative-ui parts but the bridge is disabled. " +
          "Enable the bridge in assistant-message-gui.tsx or wire MessagePrimitive.GenerativeUI.",
      );
    }
  }, [bridgeEnabled, content]);
};

export const AssistantMessageGui: FC<AssistantMessageGuiProps> = ({
  bridgeEnabled = true,
}) => {
  useDroppedGenerativeUIWarning(bridgeEnabled);

  const hasBridgedRenderGui = useAuiState((s) =>
    s.message.content.some(
      (part) =>
        part.type === "tool-call" &&
        part.toolName === RENDER_GUI_TOOL_NAME &&
        parseRenderGuiResult(part.result) != null,
    ),
  );

  const ACTION_BAR_PT = "pt-1.5";
  const ACTION_BAR_HEIGHT = `-mb-7.5 min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 relative animate-in duration-150 [contain-intrinsic-size:auto_300px] [content-visibility:auto]"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="wrap-break-word px-2 text-foreground leading-relaxed"
      >
        <MessagePrimitive.GroupedParts
          groupBy={(part) => {
            if (part.type === "reasoning") {
              return ["group-chainOfThought", "group-reasoning"];
            }
            if (part.type === "tool-call") {
              if (getMcpAppFromToolPart(part)) return [];
              if (part.toolName === RENDER_GUI_TOOL_NAME) return [];
              return ["group-chainOfThought", "group-tool"];
            }
            return [];
          }}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case "group-reasoning": {
                const running = part.status.type === "running";
                return (
                  <ReasoningRoot defaultOpen={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case "group-tool":
                return (
                  <ToolGroupRoot>
                    <ToolGroupTrigger
                      count={part.indices.length}
                      active={part.status.type === "running"}
                    />
                    <ToolGroupContent>{children}</ToolGroupContent>
                  </ToolGroupRoot>
                );
              case "text":
                if (
                  bridgeEnabled &&
                  hasBridgedRenderGui &&
                  isLeakedRenderGuiText(part.text)
                ) {
                  return null;
                }
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "generative-ui":
                return bridgeEnabled ? <AllowlistedGenerativeUI /> : null;
              case "tool-call": {
                if (bridgeEnabled && part.toolName === RENDER_GUI_TOOL_NAME) {
                  const spec = parseRenderGuiResult(part.result);
                  if (spec) return <AllowlistedGenerativeUI spec={spec} />;
                }
                return part.toolUI ?? <ToolFallback {...part} />;
              }
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
            <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>

      <div
        data-slot="aui_assistant-message-footer"
        className={cn("ms-2 flex items-center", ACTION_BAR_HEIGHT)}
      >
        <BranchPickerPrimitive.Root
          hideWhenSingleBranch
          className="aui-branch-picker-root -ms-2 me-2 inline-flex items-center text-muted-foreground text-xs"
        >
          <BranchPickerPrimitive.Previous asChild>
            <TooltipIconButton tooltip="Previous">
              <ChevronLeftIcon />
            </TooltipIconButton>
          </BranchPickerPrimitive.Previous>
          <span className="aui-branch-picker-state font-medium">
            <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
          </span>
          <BranchPickerPrimitive.Next asChild>
            <TooltipIconButton tooltip="Next">
              <ChevronRightIcon />
            </TooltipIconButton>
          </BranchPickerPrimitive.Next>
        </BranchPickerPrimitive.Root>
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="aui-assistant-action-bar-root -ms-1 flex gap-1 text-muted-foreground"
        >
          <ActionBarPrimitive.Copy asChild>
            <TooltipIconButton tooltip="Copy">
              <AuiIf condition={(s) => s.message.isCopied}>
                <CheckIcon />
              </AuiIf>
              <AuiIf condition={(s) => !s.message.isCopied}>
                <CopyIcon />
              </AuiIf>
            </TooltipIconButton>
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.Reload asChild>
            <TooltipIconButton tooltip="Refresh">
              <RefreshCwIcon />
            </TooltipIconButton>
          </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
};
