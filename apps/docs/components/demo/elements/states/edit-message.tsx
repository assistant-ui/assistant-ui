"use client";

import { EditMessage } from "@/components/assistant-ui/elements/edit-message";
import { defineStates } from "./types";

const noop = () => {};

const handlers = {
  onValueChange: noop,
  onSave: noop,
  onCancel: noop,
  onStartEdit: noop,
};

const ORIGINAL = "Explain how the composer keeps its draft.";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "idle",
    label: "Sent",
    note: "The sent message before the user opens it for editing.",
    Component: () => (
      <EditMessage
        {...handlers}
        value={ORIGINAL}
        discardedReplies={3}
        editing={false}
      />
    ),
  },
  {
    key: "no-loss",
    label: "Latest turn",
    note: "Editing the newest turn throws nothing away, so the warning is gone.",
    Component: () => (
      <EditMessage
        {...handlers}
        value={ORIGINAL}
        discardedReplies={0}
        editing
      />
    ),
  },
  {
    key: "one-reply",
    label: "One reply",
    note: "The warning uses the singular when only one reply would be lost.",
    Component: () => (
      <EditMessage
        {...handlers}
        value="Explain how the composer keeps its draft between threads."
        discardedReplies={1}
        editing
      />
    ),
  },
  {
    key: "long-content",
    label: "Long message",
    note: "A long message scrolls inside the two-row field.",
    Component: () => (
      <EditMessage
        {...handlers}
        value="Explain how the composer keeps its draft. I want to know where the text lives while I switch threads, what happens on a full page reload, whether attachments survive too, and how this behaves with a remote thread list where the thread id is only assigned after the first message."
        discardedReplies={12}
        editing
      />
    ),
  },
]);
