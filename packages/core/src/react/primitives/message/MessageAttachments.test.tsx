/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CompleteAttachment } from "../../../types/attachment";

const mocks = vi.hoisted(() => ({
  role: "user" as "user" | "assistant",
  attachments: undefined as CompleteAttachment[] | undefined,
  aui: {
    message: {
      attachment: ({ index }: { index: number }) => ({
        getState: () => mocks.attachments?.[index],
      }),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({
      message: {
        role: mocks.role,
        attachments: mocks.attachments,
      },
    }),
  RenderChildrenWithAccessor: ({
    getItemState,
    children,
  }: {
    getItemState: (aui: typeof mocks.aui) => CompleteAttachment;
    children: (getItem: () => CompleteAttachment) => ReactNode;
  }) => children(() => getItemState(mocks.aui)),
}));

vi.mock(
  "../../providers/AttachmentByIndexProvider",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../providers/AttachmentByIndexProvider")
    >()),
    MessageAttachmentByIndexProvider: ({ children }: { children: ReactNode }) =>
      children,
  }),
);

import { MessagePrimitiveAttachments } from "./MessageAttachments";

const attachment = (id: string): CompleteAttachment => ({
  id,
  type: "file",
  name: `${id}.txt`,
  status: { type: "complete" },
  content: [],
});

const StatefulAttachment = ({
  attachment,
}: {
  attachment: CompleteAttachment;
}) => {
  const [initialId] = useState(attachment.id);
  return <span>{initialId}</span>;
};

describe("MessagePrimitiveAttachments", () => {
  it("treats missing user message attachments as empty", () => {
    mocks.role = "user";
    mocks.attachments = undefined;

    const view = render(
      <MessagePrimitiveAttachments>{() => null}</MessagePrimitiveAttachments>,
    );

    expect(view.container.childElementCount).toBe(0);
  });

  it("does not reuse component state for a different attachment", () => {
    mocks.role = "user";
    mocks.attachments = [attachment("first-file"), attachment("second-file")];

    const view = render(
      <MessagePrimitiveAttachments>
        {({ attachment }) => <StatefulAttachment attachment={attachment} />}
      </MessagePrimitiveAttachments>,
    );

    mocks.attachments = [mocks.attachments[1]!];
    view.rerender(
      <MessagePrimitiveAttachments>
        {({ attachment }) => <StatefulAttachment attachment={attachment} />}
      </MessagePrimitiveAttachments>,
    );

    expect(screen.queryByText("second-file")).not.toBeNull();
    expect(screen.queryByText("first-file")).toBeNull();
  });

  it("keeps component state with attachments when they are reordered", () => {
    mocks.role = "user";
    mocks.attachments = [attachment("first-file"), attachment("second-file")];

    const view = render(
      <MessagePrimitiveAttachments>
        {({ attachment }) => <StatefulAttachment attachment={attachment} />}
      </MessagePrimitiveAttachments>,
    );

    mocks.attachments = [mocks.attachments[1]!, mocks.attachments[0]!];
    view.rerender(
      <MessagePrimitiveAttachments>
        {({ attachment }) => <StatefulAttachment attachment={attachment} />}
      </MessagePrimitiveAttachments>,
    );

    expect(view.container.textContent).toBe("second-filefirst-file");
  });

  it("assigns distinct React keys to duplicate attachment IDs", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.role = "user";
    mocks.attachments = [
      { ...attachment("duplicate"), name: "first.txt" },
      { ...attachment("duplicate"), name: "second.txt" },
    ];

    try {
      render(
        <MessagePrimitiveAttachments>
          {({ attachment }) => <span>{attachment.name}</span>}
        </MessagePrimitiveAttachments>,
      );

      expect(screen.queryByText("first.txt")).not.toBeNull();
      expect(screen.queryByText("second.txt")).not.toBeNull();
      expect(consoleError.mock.calls.flat().join(" ")).not.toContain(
        "same key",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
