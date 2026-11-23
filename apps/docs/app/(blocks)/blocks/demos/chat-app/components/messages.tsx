"use client";

import {
  ActionBarPrimitive,
  type AssistantState,
  ErrorPrimitive,
  type FileMessagePartComponent,
  groupPartByType,
  type ImageMessagePartComponent,
  MessagePrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { PencilIcon } from "lucide-react";
import type { ReactNode } from "react";
import { UserMessageAttachments } from "@/components/assistant-ui/elements/attachment.aui";
import { DirectiveText } from "@/components/assistant-ui/elements/directive-text.aui";
import { File } from "@/components/assistant-ui/elements/file";
import { Image } from "@/components/assistant-ui/elements/image";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { QuoteBlock } from "@/components/assistant-ui/elements/quote.aui";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
} from "@/components/assistant-ui/elements/reasoning.aui";
import {
  ToolGroupContent,
  ToolGroupRoot,
} from "@/components/assistant-ui/elements/tool-group.aui";
import { TraceLine } from "@/components/shared/trace-line";
import {
  describePublicAssistantError,
  unwrapErrorEnvelope,
} from "@/lib/public-assistant-errors";
import { cn } from "@/lib/utils";
import { AssistantActionBar, BranchPicker } from "./action-bar";
import { Sources } from "./sources";
import { actionButtonClass } from "./styles";
import { DisclosureTrigger, disclosureContentClass, ToolCall } from "./trace";

const groupAssistantParts = groupPartByType({
  reasoning: ["group-chainOfThought", "group-reasoning"],
  source: ["group-chainOfThought", "group-source"],
  "tool-call": ["group-chainOfThought", "group-tool"],
  "standalone-tool-call": [],
});

const getMessageErrorText = (s: AssistantState): string | undefined => {
  const status = s.message.status;
  if (status?.type !== "incomplete" || status.reason !== "error") {
    return undefined;
  }
  const error = status.error;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return undefined;
};

const UserFilePart: FileMessagePartComponent = (part) => (
  <div className="py-1">
    <File {...part} />
  </div>
);

const UserImagePart: ImageMessagePartComponent = (part) => (
  <div className="py-1">
    <Image {...part} />
  </div>
);

export function UserMessage(): ReactNode {
  return (
    <MessagePrimitive.Root
      data-role="user"
      className="animate-in fade-in slide-in-from-bottom-1 mx-auto flex w-full max-w-(--thread-max-width) flex-col items-end duration-150"
    >
      <div className="w-full has-[.aui-attachment-root]:mb-2">
        <UserMessageAttachments />
      </div>
      <div className="relative max-w-[80%]">
        <div className="peer bg-muted rounded-thread px-4 py-2 text-[15px] wrap-break-word empty:hidden">
          <MessagePrimitive.Quote>
            {(quote) => <QuoteBlock {...quote} />}
          </MessagePrimitive.Quote>
          <MessagePrimitive.Parts
            components={{
              Text: DirectiveText,
              File: UserFilePart,
              Image: UserImagePart,
            }}
          />
        </div>
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-1.5 peer-empty:hidden"
        >
          <ActionBarPrimitive.Edit
            aria-label="Edit message"
            className={actionButtonClass}
          >
            <PencilIcon className="size-4" />
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
      </div>
      <BranchPicker className="-me-1 mt-1" />
    </MessagePrimitive.Root>
  );
}

export function AssistantMessage(): ReactNode {
  return (
    <MessagePrimitive.Root
      data-role="assistant"
      className="animate-in fade-in slide-in-from-bottom-1 mx-auto w-full max-w-(--thread-max-width) duration-150"
    >
      <div className="text-[15px] leading-relaxed wrap-break-word">
        <MessagePrimitive.GroupedParts groupBy={groupAssistantParts}>
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div>{children}</div>;
              case "group-tool": {
                if (part.indices.length === 1) return <>{children}</>;
                const running = part.status.type === "running";
                return (
                  <ToolGroupRoot variant="ghost" className="my-1">
                    <DisclosureTrigger
                      live={running}
                      label={running ? "running" : "ran"}
                      detail={`${part.indices.length} tools`}
                    />
                    <ToolGroupContent className={disclosureContentClass}>
                      {children}
                    </ToolGroupContent>
                  </ToolGroupRoot>
                );
              }
              case "group-reasoning": {
                const running = part.status.type === "running";
                return (
                  <ReasoningRoot
                    variant="ghost"
                    streaming={running}
                    className="my-1 mb-3"
                  >
                    <DisclosureTrigger
                      live={running}
                      label={running ? "thinking" : "reasoning"}
                    />
                    <ReasoningContent
                      aria-busy={running}
                      className={disclosureContentClass}
                    >
                      <ReasoningText className="ps-0">{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case "group-source":
                return null;
              case "text":
                return part.text === "" && part.status?.type === "running" ? (
                  <TraceLine live label="thinking" />
                ) : (
                  <MarkdownText />
                );
              case "reasoning":
                return <Reasoning {...part} />;
              case "source":
                return null;
              case "tool-call":
                return part.toolUI ?? <ToolCall {...part} />;
              case "data":
                return part.dataRendererUI;
              case "image":
                return (
                  <div className="py-1">
                    <Image {...part} />
                  </div>
                );
              case "file":
                return (
                  <div className="py-1">
                    <File {...part} />
                  </div>
                );
              case "indicator":
                return <TraceLine live label="thinking" />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <Sources />
        <MessageError />
      </div>
      <div className="mt-2 flex items-center gap-1.5 empty:hidden">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
}

function MessageError(): ReactNode {
  const errorText = useAuiState(getMessageErrorText);
  const notice =
    errorText === undefined
      ? undefined
      : describePublicAssistantError(errorText);

  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root
        className={cn(
          "mt-2 border-l-2 pl-3 text-[13px]",
          notice
            ? "border-foreground/20 text-muted-foreground"
            : "border-destructive/60 text-destructive",
        )}
      >
        {notice ? (
          <p>{notice}</p>
        ) : errorText !== undefined ? (
          <p className="line-clamp-2">{unwrapErrorEnvelope(errorText)}</p>
        ) : (
          <ErrorPrimitive.Message className="line-clamp-2" />
        )}
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
}
