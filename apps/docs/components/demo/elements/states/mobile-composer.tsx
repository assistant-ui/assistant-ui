"use client";

import { MobileComposer } from "@/components/assistant-ui/elements/mobile-composer";
import { defineStates } from "./types";

const noop = () => {};

const ACTIONS = ["Summarize", "Explain code", "Write tests", "Find a bug"];

const handlers = {
  onAction: noop,
  onAttach: noop,
  onValueChange: noop,
  onSend: noop,
  onStop: noop,
  onFocus: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "keyboard-open",
    label: "Keyboard open",
    note: "Focused with the keyboard up, so the quick actions hide.",
    Component: () => (
      <MobileComposer
        {...handlers}
        value=""
        keyboardOpen
        running={false}
        actions={ACTIONS}
      />
    ),
  },
  {
    key: "typed",
    label: "Ready to send",
    note: "Text is entered, so the mic hides and send is enabled.",
    Component: () => (
      <MobileComposer
        {...handlers}
        value="Why does the composer re-render?"
        keyboardOpen
        running={false}
        actions={ACTIONS}
      />
    ),
  },
  {
    key: "running",
    label: "Running",
    note: "A reply is generating, so the send button becomes stop.",
    Component: () => (
      <MobileComposer
        {...handlers}
        value=""
        keyboardOpen={false}
        running
        actions={ACTIONS}
      />
    ),
  },
  {
    key: "disabled",
    label: "Disabled",
    note: "Without handlers the attach and quick action buttons are disabled.",
    Component: () => (
      <MobileComposer
        value=""
        keyboardOpen={false}
        running={false}
        actions={ACTIONS}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long input",
    note: "Many quick actions scroll sideways and long text stays on one line.",
    Component: () => (
      <MobileComposer
        {...handlers}
        value="Find the test that covers draft restore on remote threads after a reload and tell me if it passes"
        keyboardOpen={false}
        running={false}
        actions={[
          ...ACTIONS,
          "Review my diff",
          "Draft release notes",
          "Explain this error",
        ]}
      />
    ),
  },
]);
