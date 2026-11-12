"use client";

import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerBar,
  ComposerContext,
  ComposerInput,
  ComposerSend,
  ComposerToolbar,
  type ComposerUsage,
} from "@/components/assistant-ui/elements/composer";
import { defineStates } from "./types";

const noop = () => {};

function Rail({ usage }: { usage: ComposerUsage }) {
  return (
    <Composer>
      <ComposerBar>
        <ComposerInput
          value=""
          placeholder="Ask anything"
          onChange={noop}
          onSubmit={noop}
        />
        <ComposerToolbar>
          <ComposerActions>
            <ComposerAttachButton onClick={noop} />
          </ComposerActions>
          <ComposerActions>
            <ComposerContext usage={usage} />
            <ComposerSend streaming={false} idle onClick={noop} />
          </ComposerActions>
        </ComposerToolbar>
      </ComposerBar>
    </Composer>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Fresh thread",
    note: "Only the system prompt and tools take space, so the ring is nearly empty.",
    Component: () => (
      <Rail usage={{ system: 12, tools: 8, messages: 0, total: 200 }} />
    ),
  },
  {
    key: "warning",
    label: "Near limit",
    note: "Past 85 percent of the window the ring turns red.",
    Component: () => (
      <Rail usage={{ system: 12, tools: 8, messages: 162, total: 200 }} />
    ),
  },
  {
    key: "full",
    label: "Full",
    note: "Usage passed the window, so the ring stays closed and red.",
    Component: () => (
      <Rail usage={{ system: 12, tools: 8, messages: 196, total: 200 }} />
    ),
  },
]);
