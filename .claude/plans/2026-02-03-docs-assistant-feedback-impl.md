# Docs Assistant Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add thumbs up/down feedback buttons to docs assistant chat with PostHog telemetry.

**Architecture:** FeedbackPopover component for category selection, AssistantActionBar wraps the primitives and collects context, analytics.ts gets new method following existing patterns.

**Tech Stack:** React, Radix Popover, @assistant-ui/react primitives, PostHog via existing analytics.ts

---

### Task 1: Add analytics method

**Files:**
- Modify: `apps/docs/lib/analytics.ts`

**Step 1: Add the assistant feedback method**

Add to `analytics.ts` before the closing `}` of the `analytics` object (after line 147):

```typescript
  assistant: {
    feedbackSubmitted: (props: {
      threadId: string;
      messageId: string;
      type: "positive" | "negative";
      category?:
        | "wrong_information"
        | "outdated"
        | "didnt_answer"
        | "too_vague"
        | "other";
      comment?: string;
      userQuestion: string;
      assistantResponse: string;
      toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
    }) => trackEvent("assistant_feedback_submitted", props),
  },
```

**Step 2: Verify no lint errors**

Run: `pnpm --filter @assistant-ui/docs lint`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/docs/lib/analytics.ts
git commit -m "feat(docs): add assistant feedback analytics method"
```

---

### Task 2: Create FeedbackPopover component

**Files:**
- Create: `apps/docs/components/docs/assistant/feedback-popover.tsx`

**Step 1: Create the popover component**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "wrong_information", label: "Wrong information" },
  { value: "outdated", label: "Outdated" },
  { value: "didnt_answer", label: "Didn't answer my question" },
  { value: "too_vague", label: "Too vague" },
  { value: "other", label: "Other" },
] as const;

export type FeedbackCategory = (typeof CATEGORIES)[number]["value"];

type FeedbackPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (category: FeedbackCategory, comment?: string) => void;
  children: ReactNode;
};

export function FeedbackPopover({
  open,
  onOpenChange,
  onSubmit,
  children,
}: FeedbackPopoverProps): ReactNode {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!category) return;
    onSubmit(category, comment || undefined);
    setCategory(null);
    setComment("");
    onOpenChange(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-lg border border-border bg-popover p-4 shadow-md"
          sideOffset={5}
          align="start"
        >
          <div className="space-y-3">
            <p className="font-medium text-sm">What went wrong?</p>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="feedback-category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={() => setCategory(cat.value)}
                    className="accent-primary"
                  />
                  {cat.label}
                </label>
              ))}
            </div>
            <textarea
              placeholder="Additional details (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={cn(
                "w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
              )}
              rows={2}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!category}
              className={cn(
                "w-full rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "hover:bg-primary/90",
              )}
            >
              Submit
            </button>
          </div>
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

**Step 2: Verify no lint errors**

Run: `pnpm --filter @assistant-ui/docs lint`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/docs/components/docs/assistant/feedback-popover.tsx
git commit -m "feat(docs): add FeedbackPopover component"
```

---

### Task 3: Create AssistantActionBar component

**Files:**
- Create: `apps/docs/components/docs/assistant/assistant-action-bar.tsx`

**Step 1: Create the action bar component**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { ActionBarPrimitive } from "@assistant-ui/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import {
  FeedbackPopover,
  type FeedbackCategory,
} from "./feedback-popover";

function getMessageText(
  content: readonly { type: string; text?: string }[],
): string {
  return content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function getToolCalls(
  content: readonly { type: string; toolName?: string; args?: unknown }[],
): Array<{ toolName: string; args: Record<string, unknown> }> {
  return content
    .filter(
      (p): p is { type: "tool-call"; toolName: string; args: unknown } =>
        p.type === "tool-call",
    )
    .map((p) => ({
      toolName: p.toolName,
      args: (p.args as Record<string, unknown>) ?? {},
    }));
}

export function AssistantActionBar(): ReactNode {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const aui = useAui();
  const messageId = useAuiState(({ message }) => message.id);
  const parentId = useAuiState(({ message }) => message.parentId);
  const content = useAuiState(({ message }) => message.content);
  const threadId = useAuiState(({ threadListItem }) => threadListItem.id);
  const messages = useAuiState(({ thread }) => thread.messages);
  const isPositiveSubmitted = useAuiState(
    ({ message }) => message.metadata?.submittedFeedback?.type === "positive",
  );
  const isNegativeSubmitted = useAuiState(
    ({ message }) => message.metadata?.submittedFeedback?.type === "negative",
  );

  const userMessage = messages.find((m) => m.id === parentId);
  const userQuestion = userMessage ? getMessageText(userMessage.content) : "";
  const assistantResponse = getMessageText(content);
  const toolCalls = getToolCalls(content);

  const handlePositiveFeedback = () => {
    aui.message().submitFeedback({ type: "positive" });
    analytics.assistant.feedbackSubmitted({
      threadId,
      messageId,
      type: "positive",
      userQuestion,
      assistantResponse,
      toolCalls,
    });
  };

  const handleNegativeFeedback = (
    category: FeedbackCategory,
    comment?: string,
  ) => {
    aui.message().submitFeedback({ type: "negative" });
    analytics.assistant.feedbackSubmitted({
      threadId,
      messageId,
      type: "negative",
      category,
      comment,
      userQuestion,
      assistantResponse,
      toolCalls,
    });
  };

  return (
    <ActionBarPrimitive.Root className="mt-2 flex items-center gap-1">
      <ActionBarPrimitive.FeedbackPositive
        onClick={handlePositiveFeedback}
        className={cn(
          "rounded p-1 text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isPositiveSubmitted && "text-green-600 dark:text-green-400",
        )}
      >
        <ThumbsUpIcon className="size-4" />
      </ActionBarPrimitive.FeedbackPositive>

      <FeedbackPopover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        onSubmit={handleNegativeFeedback}
      >
        <ActionBarPrimitive.FeedbackNegative
          onClick={() => setPopoverOpen(true)}
          className={cn(
            "rounded p-1 text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isNegativeSubmitted && "text-red-600 dark:text-red-400",
          )}
        >
          <ThumbsDownIcon className="size-4" />
        </ActionBarPrimitive.FeedbackNegative>
      </FeedbackPopover>
    </ActionBarPrimitive.Root>
  );
}
```

**Step 2: Verify no lint errors**

Run: `pnpm --filter @assistant-ui/docs lint`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/docs/components/docs/assistant/assistant-action-bar.tsx
git commit -m "feat(docs): add AssistantActionBar with feedback buttons"
```

---

### Task 4: Integrate into AssistantMessage

**Files:**
- Modify: `apps/docs/components/docs/assistant/messages.tsx`

**Step 1: Add import**

Add at top of file with other imports:

```tsx
import { AssistantActionBar } from "./assistant-action-bar";
```

**Step 2: Add action bar to AssistantMessage**

Modify the `AssistantMessage` function to include the action bar after the message content. Replace lines 31-49:

```tsx
export function AssistantMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="text-sm">
        <MessagePrimitive.Parts
          components={{
            Empty: Thinking,
            Text: MarkdownText,
            Reasoning,
            ReasoningGroup,
            tools: {
              Fallback: ToolCall,
            },
          }}
        />
        <MessageError />
      </div>
      <AssistantActionBar />
    </MessagePrimitive.Root>
  );
}
```

**Step 3: Verify no lint errors**

Run: `pnpm --filter @assistant-ui/docs lint`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/docs/components/docs/assistant/messages.tsx
git commit -m "feat(docs): integrate feedback action bar into assistant messages"
```

---

### Task 5: Manual test

**Step 1: Start dev server**

Run: `pnpm docs:dev`

**Step 2: Test the feedback flow**

1. Navigate to docs site
2. Open assistant chat
3. Send a message and wait for response
4. Verify thumbs up/down buttons appear below assistant message
5. Click thumbs up - verify it turns green
6. Send another message
7. Click thumbs down - verify popover opens
8. Select a category and submit
9. Verify button turns red and popover closes

**Step 3: Check browser console**

Open browser devtools, filter for "assistant_feedback" to verify events are being sent.

---

### Task 6: Final commit with all changes

**Step 1: Verify all files are committed**

Run: `git status`
Expected: Clean working directory

If any uncommitted changes, commit them:

```bash
git add -A
git commit -m "chore(docs): cleanup feedback implementation"
```
