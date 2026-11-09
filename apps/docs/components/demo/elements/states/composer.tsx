"use client";

import type { ReactNode } from "react";
import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerAttachmentChip,
  ComposerAttachments,
  ComposerBar,
  ComposerContext,
  ComposerInput,
  ComposerModelTrigger,
  ComposerSend,
  ComposerToolbar,
  ComposerVoiceButton,
  type ComposerAttachment,
} from "@/components/assistant-ui/elements/composer";
import { defineStates } from "./types";

const noop = () => {};

function Frame({
  value = "",
  attachments = [],
  streaming = false,
  attach = true,
}: {
  value?: string;
  attachments?: ComposerAttachment[];
  streaming?: boolean;
  attach?: boolean;
}): ReactNode {
  return (
    <Composer>
      <ComposerBar>
        {attachments.length > 0 && (
          <ComposerAttachments>
            {attachments.map((attachment) => (
              <ComposerAttachmentChip
                key={attachment.name}
                attachment={attachment}
                onRemove={noop}
              />
            ))}
          </ComposerAttachments>
        )}
        <ComposerInput
          value={value}
          placeholder="Ask anything"
          onChange={noop}
          onSubmit={noop}
        />
        <ComposerToolbar>
          <ComposerActions>
            <ComposerAttachButton onClick={attach ? noop : undefined} />
            <ComposerModelTrigger
              model="Fable 5.1"
              open={false}
              onClick={noop}
            />
          </ComposerActions>
          <ComposerActions>
            <ComposerContext
              usage={{ system: 12, tools: 8, messages: 54, total: 200 }}
            />
            <ComposerVoiceButton active={false} onClick={noop} />
            <ComposerSend
              streaming={streaming}
              idle={value.length === 0}
              onClick={noop}
            />
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
    label: "Empty",
    note: "Nothing typed or attached, so send stays muted.",
    Component: () => <Frame />,
  },
  {
    key: "ready",
    label: "Ready",
    note: "Text and a file are staged and send is live.",
    Component: () => (
      <Frame
        value="Summarize the review threads from this week"
        attachments={[
          {
            name: "screenshot.png",
            meta: "128 KB",
            state: "done",
            kind: "image",
          },
        ]}
      />
    ),
  },
  {
    key: "streaming",
    label: "Streaming",
    note: "A reply is generating, so send turns into stop.",
    Component: () => <Frame streaming />,
  },
  {
    key: "disabled",
    label: "No uploads",
    note: "Without an attach handler the plus button is disabled.",
    Component: () => <Frame value="Draft the release notes" attach={false} />,
  },
]);
