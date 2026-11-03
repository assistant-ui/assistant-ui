"use client";

import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerAttachmentChip,
  ComposerAttachments,
  ComposerBar,
  ComposerInput,
  ComposerSend,
  ComposerToolbar,
  type ComposerAttachment,
} from "@/components/assistant-ui/elements/composer";
import { defineStates } from "./types";

const noop = () => {};

function Staged({
  attachments,
  value = "",
}: {
  attachments: ComposerAttachment[];
  value?: string;
}) {
  return (
    <Composer>
      <ComposerBar>
        <ComposerAttachments>
          {attachments.map((attachment) => (
            <ComposerAttachmentChip
              key={attachment.name}
              attachment={attachment}
              onRemove={noop}
            />
          ))}
        </ComposerAttachments>
        <ComposerInput
          value={value}
          placeholder="Ask anything"
          onChange={noop}
          onSubmit={noop}
        />
        <ComposerToolbar>
          <ComposerActions>
            <ComposerAttachButton onClick={noop} />
          </ComposerActions>
          <ComposerActions>
            <ComposerSend
              streaming={false}
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
    key: "uploading",
    label: "Uploading",
    note: "Files still uploading show a spinner and a progress bar.",
    Component: () => (
      <Staged
        attachments={[
          {
            name: "screenshot.png",
            meta: "uploading",
            state: "uploading",
            progress: 62,
            kind: "image",
          },
          {
            name: "fixtures.zip",
            meta: "uploading",
            state: "uploading",
            progress: 18,
            kind: "archive",
          },
        ]}
      />
    ),
  },
  {
    key: "error",
    label: "Failed",
    note: "A failed upload shows its error next to a file that made it.",
    Component: () => (
      <Staged
        value="Why does this trace stall at step 4?"
        attachments={[
          {
            name: "trace.log",
            meta: "38 KB",
            state: "done",
            kind: "text",
          },
          {
            name: "heap-snapshot.zip",
            meta: "Too large, max 25 MB",
            state: "error",
            kind: "archive",
          },
        ]}
      />
    ),
  },
  {
    key: "many-files",
    label: "Many files",
    note: "More files than fit on one row wrap onto the next.",
    Component: () => (
      <Staged
        attachments={[
          { name: "home.png", meta: "212 KB", state: "done", kind: "image" },
          {
            name: "settings.png",
            meta: "184 KB",
            state: "done",
            kind: "image",
          },
          {
            name: "checkout.png",
            meta: "201 KB",
            state: "done",
            kind: "image",
          },
          { name: "server.log", meta: "1.2 MB", state: "done", kind: "text" },
          {
            name: "build-output.zip",
            meta: "4.8 MB",
            state: "done",
            kind: "archive",
          },
        ]}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long name",
    note: "A long file name truncates inside its chip.",
    Component: () => (
      <Staged
        attachments={[
          {
            name: "2026-11-03-production-incident-postmortem-final-v3.pdf",
            meta: "2.4 MB",
            state: "done",
            kind: "text",
          },
        ]}
      />
    ),
  },
]);
