"use client";

import { File } from "@/components/assistant-ui/elements/file";
import { defineStates } from "./types";

const COMPLETE = { type: "complete" } as const;

// "name,plan,seats\nAcme,Pro,25\nGlobex,Team,8\n" in base64.
const CSV_BASE64 = "bmFtZSxwbGFuLHNlYXRzCkFjbWUsUHJvLDI1Ckdsb2JleCxUZWFtLDgK";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-md flex-col items-start gap-2">
      {children}
    </div>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "remote-url",
    label: "Remote URL",
    note: "A file passed by URL opens in a new tab and shows no size.",
    Component: () => (
      <Frame>
        <File
          type="file"
          filename="invoice-2026-10.pdf"
          mimeType="application/pdf"
          data="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
          status={COMPLETE}
        />
      </Frame>
    ),
  },
  {
    key: "id-reference",
    label: "ID reference",
    note: "A file referenced by provider ID has nothing to download, so the button is hidden.",
    Component: () => (
      <Frame>
        <File
          type="file"
          filename="customer-export.csv"
          mimeType="text/csv"
          data="file-6yGqA8kV2pLmT3nE"
          sourceType="id"
          status={COMPLETE}
        />
      </Frame>
    ),
  },
  {
    key: "no-filename",
    label: "No filename",
    note: "Without a filename the card labels the file by its type.",
    Component: () => (
      <Frame>
        <File
          type="file"
          mimeType="text/csv"
          data={CSV_BASE64}
          status={COMPLETE}
        />
      </Frame>
    ),
  },
  {
    key: "audio",
    label: "Audio",
    note: "Audio files play inline with the size and download link below.",
    Component: () => (
      <Frame>
        <File
          type="file"
          filename="c-major-arpeggio.mp3"
          mimeType="audio/mpeg"
          data="https://www.assistant-ui.com/media/c-major-arpeggio.mp3"
          status={COMPLETE}
        />
      </Frame>
    ),
  },
  {
    key: "long-content",
    label: "Long name",
    note: "A long filename truncates inside the card.",
    Component: () => (
      <Frame>
        <File
          type="file"
          filename="2026-q3-enterprise-customer-renewals-with-churn-risk-scores-final-v4.csv"
          mimeType="text/csv"
          data={CSV_BASE64}
          status={COMPLETE}
        />
      </Frame>
    ),
  },
]);
