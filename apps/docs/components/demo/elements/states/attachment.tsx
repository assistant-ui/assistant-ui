"use client";

import { useEffect, useMemo } from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useExternalStoreRuntime,
  type AttachmentAdapter,
  type PendingAttachment,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { defineStates } from "./types";

type Mode = "ready" | "uploading" | "error";

type SeedFile = { name: string; type: string; body?: string };

const SCREENSHOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dbeafe"/><stop offset="1" stop-color="#93c5fd"/></linearGradient></defs><rect width="240" height="240" fill="url(#g)"/><rect x="28" y="40" width="184" height="24" rx="6" fill="#fff" opacity=".85"/><rect x="28" y="80" width="120" height="120" rx="10" fill="#fff" opacity=".7"/><rect x="160" y="80" width="52" height="56" rx="8" fill="#fff" opacity=".7"/></svg>`;

const IMAGE: SeedFile = {
  name: "checkout-bug.svg",
  type: "image/svg+xml",
  body: SCREENSHOT_SVG,
};
const PDF: SeedFile = { name: "q3-report.pdf", type: "application/pdf" };
const CSV: SeedFile = { name: "orders-oct.csv", type: "text/csv" };

const statusFor = (mode: Mode): PendingAttachment["status"] =>
  mode === "uploading"
    ? { type: "running", reason: "uploading", progress: 0.4 }
    : mode === "error"
      ? {
          type: "incomplete",
          reason: "error",
          message: "File is larger than the 10 MB upload limit",
        }
      : { type: "requires-action", reason: "composer-send" };

function createAdapter(mode: Mode): AttachmentAdapter {
  return {
    accept: "*",
    async *add({ file }) {
      const attachment: PendingAttachment = {
        id: file.name,
        type: file.type.startsWith("image/") ? "image" : "document",
        name: file.name,
        contentType: file.type,
        file,
        status: statusFor(mode),
      };
      yield attachment;
      // An upload in flight stays in flight: the fixture never settles it.
      if (mode === "uploading") await new Promise<never>(() => {});
    },
    async remove() {},
    async send(attachment) {
      return { ...attachment, status: { type: "complete" }, content: [] };
    },
  };
}

function SeedFiles({ files }: { files: readonly SeedFile[] }) {
  const aui = useAui();
  useEffect(() => {
    for (const seed of files) {
      const file = new File([seed.body ?? seed.name], seed.name, {
        type: seed.type,
      });
      aui.composer.addAttachment(file).catch(() => {});
    }
    return () => {
      aui.composer.clearAttachments().catch(() => {});
    };
  }, [aui, files]);
  return null;
}

function ComposerFixture({
  mode,
  files,
}: {
  mode: Mode;
  files: readonly SeedFile[];
}) {
  const adapters = useMemo(
    () => ({ attachments: createAdapter(mode) }),
    [mode],
  );
  return (
    <SampleRuntimeProvider adapters={adapters}>
      <SeedFiles files={files} />
      <div className="w-full max-w-xl">
        <ComposerPrimitive.Root className="border-border bg-muted dark:border-muted-foreground/15 flex w-full flex-col gap-2 rounded-3xl border p-2">
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            rows={1}
            className="min-h-10 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
          />
          <div className="flex items-center justify-between">
            <ComposerAddAttachment />
          </div>
        </ComposerPrimitive.Root>
      </div>
    </SampleRuntimeProvider>
  );
}

const CREATED_AT = new Date("2026-09-26T12:00:00Z");

const sentMessages: ThreadMessageLike[] = [
  {
    id: "user-1",
    role: "user",
    createdAt: CREATED_AT,
    content:
      "Why does the total jump on this screen? The numbers are in the report.",
    attachments: [
      {
        id: "att-image",
        type: "image",
        name: "checkout-total.jpg",
        contentType: "image/jpeg",
        status: { type: "complete" },
        content: [
          {
            type: "image",
            image:
              "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80",
          },
        ],
      },
      {
        id: "att-pdf",
        type: "document",
        name: "q3-report.pdf",
        contentType: "application/pdf",
        status: { type: "complete" },
        content: [],
      },
    ],
  },
];

function SentUserMessage() {
  return (
    <MessagePrimitive.Root className="grid w-full grid-cols-[1fr_auto] gap-y-2">
      <UserMessageAttachments />
      <div className="bg-muted col-start-2 max-w-[80%] justify-self-end rounded-2xl px-4 py-2.5 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function SentFixture() {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: sentMessages,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="w-full max-w-xl">
        <ThreadPrimitive.Messages components={{ Message: SentUserMessage }} />
      </div>
    </AssistantRuntimeProvider>
  );
}

const MANY: readonly SeedFile[] = [
  IMAGE,
  PDF,
  CSV,
  { name: "contract-draft.docx", type: "application/msword" },
  { ...IMAGE, name: "mobile-checkout.svg" },
  { name: "error-log.txt", type: "text/plain" },
  { name: "pricing-2026.xlsx", type: "application/vnd.ms-excel" },
  { ...IMAGE, name: "desktop-checkout.svg" },
  { name: "notes.md", type: "text/markdown" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "uploading",
    label: "Uploading",
    note: "Files still uploading show a spinner over the tile.",
    Component: () => <ComposerFixture mode="uploading" files={[IMAGE, PDF]} />,
  },
  {
    key: "error",
    label: "Upload failed",
    note: "A failed upload gets a red ring and the reason in its tooltip.",
    Component: () => <ComposerFixture mode="error" files={[PDF]} />,
  },
  {
    key: "sent",
    label: "In message",
    note: "Sent attachments sit above the user's message with no remove button.",
    Component: () => <SentFixture />,
  },
  {
    key: "long-content",
    label: "Many files",
    note: "More attachments than fit scroll sideways in the composer.",
    Component: () => <ComposerFixture mode="ready" files={MANY} />,
  },
]);
