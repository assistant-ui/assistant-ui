# Docs Assistant Feedback Telemetry

## Overview

Add user feedback collection to the docs assistant chat to identify and fix response quality issues.

## User Flow

1. User sees thumbs up/down buttons on each assistant message
2. **Thumbs up**: Sends positive feedback event immediately, button shows "submitted" state
3. **Thumbs down**: Opens popover with:
   - Radio buttons for categories
   - Text field (optional, always visible; required context for "Other")
   - Submit button
4. On submit: Sends event, closes popover, button shows "submitted" state

## Feedback Categories

- Wrong information
- Outdated
- Didn't answer my question
- Too vague
- Other (with optional comment)

## Event Structure

Single event type `assistant_feedback_submitted` with full context:

```typescript
{
  // Core identifiers
  threadId: string,
  messageId: string,

  // Feedback data
  type: "positive" | "negative",
  category?: "wrong_information" | "outdated" | "didnt_answer" | "too_vague" | "other",
  comment?: string,

  // Context for debugging
  userQuestion: string,
  assistantResponse: string,
  toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>,

  // Metadata
  pageUrl: string,
}
```

## Implementation

### Files to Create

**`apps/docs/components/docs/assistant/feedback-popover.tsx`**
- Radix Popover with radio buttons for categories
- Optional text field for comments
- Submit button
- Controlled by parent component

**`apps/docs/components/docs/assistant/assistant-action-bar.tsx`**
- Contains thumbs up/down buttons
- Thumbs up triggers analytics directly
- Thumbs down opens FeedbackPopover
- Collects message context using hooks

### Files to Modify

**`apps/docs/components/docs/assistant/messages.tsx`**
- Add `<AssistantActionBar />` inside `AssistantMessage`

**`apps/docs/lib/analytics.ts`**
- Add `assistant.feedbackSubmitted()` method following existing patterns

### Hook Usage

Use the new store API (`useAui`, `useAuiState`) not deprecated hooks:

```typescript
// Get reactive state (select primitives to avoid re-renders)
const messageId = useAuiState(({ message }) => message.id);
const parentId = useAuiState(({ message }) => message.parentId);
const content = useAuiState(({ message }) => message.content);
const threadId = useAuiState(({ threadListItem }) => threadListItem.id);
const messages = useAuiState(({ thread }) => thread.messages);

// Get actions
const aui = useAui();
aui.message().submitFeedback({ type: "positive" });
```

Extract text and tool calls from content:
```typescript
const textParts = content.filter(p => p.type === "text");
const toolCalls = content.filter(p => p.type === "tool-call");
```

Find user question by parentId:
```typescript
const userMessage = messages.find(m => m.id === parentId);
const userQuestion = userMessage?.content
  .filter(p => p.type === "text")
  .map(p => p.text)
  .join("");
```

## Analytics Integration

Uses existing `lib/analytics.ts` pattern which sends to PostHog, Vercel Analytics, and Umami:

```typescript
assistant: {
  feedbackSubmitted: (props: {
    threadId: string;
    messageId: string;
    type: "positive" | "negative";
    category?: "wrong_information" | "outdated" | "didnt_answer" | "too_vague" | "other";
    comment?: string;
    userQuestion: string;
    assistantResponse: string;
    toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
  }) => trackEvent("assistant_feedback_submitted", props),
}
```

## Design Decisions

1. **Single event type** - Using `assistant_feedback_submitted` with `type` field makes ratio calculations easier in PostHog
2. **Full context capture** - Payload size is negligible for infrequent feedback events; saves context-switching when debugging
3. **Popover UX** - Lightweight enough to complete, noticeable enough that users will
4. **Categories + Other** - Structured data for filtering with escape hatch for unexpected issues
