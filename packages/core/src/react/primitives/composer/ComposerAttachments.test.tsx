/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Attachment } from "../../../types/attachment";

const mocks = vi.hoisted(() => ({
  attachments: [] as Attachment[],
  aui: {
    composer: {
      attachment: ({ index }: { index: number }) => ({
        getState: () => mocks.attachments[index],
      }),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ composer: { attachments: mocks.attachments } }),
  RenderChildrenWithAccessor: ({
    getItemState,
    children,
  }: {
    getItemState: (aui: typeof mocks.aui) => Attachment;
    children: (getItem: () => Attachment) => ReactNode;
  }) => children(() => getItemState(mocks.aui)),
}));

vi.mock("../../providers/AttachmentByIndexProvider", () => ({
  ComposerAttachmentByIndexProvider: ({ children }: { children: ReactNode }) =>
    children,
}));

import { ComposerPrimitiveAttachments } from "./ComposerAttachments";

const attachment = (id: string, name: string): Attachment => ({
  id,
  name,
  type: "file",
  contentType: "text/plain",
  status: { type: "complete" },
  content: [],
});

const StatefulAttachment = ({ attachment }: { attachment: Attachment }) => {
  const [initialName] = useState(attachment.name);
  return <span>{initialName}</span>;
};

describe("ComposerPrimitiveAttachments", () => {
  it("does not reuse component state for a different attachment", () => {
    mocks.attachments = [
      attachment("first", "first.txt"),
      attachment("second", "second.txt"),
    ];

    const view = render(
      <ComposerPrimitiveAttachments>
        {({ attachment }) => <StatefulAttachment attachment={attachment} />}
      </ComposerPrimitiveAttachments>,
    );

    mocks.attachments = [mocks.attachments[1]!];
    view.rerender(
      <ComposerPrimitiveAttachments>
        {({ attachment }) => <StatefulAttachment attachment={attachment} />}
      </ComposerPrimitiveAttachments>,
    );

    expect(screen.queryByText("second.txt")).not.toBeNull();
    expect(screen.queryByText("first.txt")).toBeNull();
  });
});
