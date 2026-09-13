import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserMessageAttachments as UserMessageAttachmentsBase } from "./attachment.aui";
import { UserMessageAttachments as UserMessageAttachmentsRadix } from "./attachment.aui.radix";

const mocks = vi.hoisted(() => ({
  state: { attachment: {} } as any,
  source: "message" as "message" | "composer",
  created: [] as string[],
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/react")>();

  type AttachmentChildren = React.ReactNode | (() => React.ReactNode);
  const renderAttachment = ({ children }: { children: AttachmentChildren }) =>
    typeof children === "function" ? children() : children;
  const Root = ({ children, ...props }: any) =>
    React.createElement("div", props, children);
  const Name = () =>
    React.createElement(React.Fragment, null, mocks.state.attachment.name);
  const Remove = ({ render, children }: any) =>
    render
      ? React.cloneElement(render, { children })
      : React.isValidElement(children)
        ? children
        : React.createElement("button", null, children);

  return {
    ...actual,
    useAui: () => ({ attachment: { source: mocks.source } }),
    useAuiState: (selector: (state: any) => unknown) => selector(mocks.state),
    AttachmentPrimitive: {
      ...actual.AttachmentPrimitive,
      Root,
      Name,
      Remove,
    },
    MessagePrimitive: {
      ...actual.MessagePrimitive,
      Attachments: renderAttachment,
    },
    ComposerPrimitive: {
      ...actual.ComposerPrimitive,
      Attachments: renderAttachment,
    },
  };
});

const flavors = [
  ["base", UserMessageAttachmentsBase],
  ["radix", UserMessageAttachmentsRadix],
] as const;

const setAttachment = (attachment: Record<string, unknown>) => {
  mocks.state = {
    attachment: {
      id: "attachment-1",
      name: "photo.png",
      type: "image",
      status: { type: "complete" },
      content: [],
      ...attachment,
    },
  };
};

beforeEach(() => {
  mocks.source = "message";
  mocks.created = [];
  setAttachment({});
  let counter = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => {
      const url = `blob:attachment-${counter++}`;
      mocks.created.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(flavors)("Attachment (%s)", (_flavor, Attachments) => {
  it("resolves one object URL for a local image", async () => {
    setAttachment({
      file: new File(["image"], "photo.png", { type: "image/png" }),
    });

    render(<Attachments />);

    await waitFor(() => expect(mocks.created).toHaveLength(1));

    expect(screen.getByRole("button", { name: /photo\.png/ })).toBeTruthy();
  });

  it("opens the image preview from the keyboard", async () => {
    setAttachment({
      file: new File(["image"], "photo.png", { type: "image/png" }),
    });

    const { container } = render(<Attachments />);
    await waitFor(() => expect(mocks.created).toHaveLength(1));

    fireEvent.keyDown(container.querySelector(".aui-attachment-tile")!, {
      key: "Enter",
    });

    expect(
      await screen.findByRole("dialog", { name: "photo.png preview" }),
    ).toBeTruthy();
    expect(
      document
        .querySelector(".aui-attachment-preview img")
        ?.getAttribute("src"),
    ).toBe(mocks.created[0]);
  });

  it("keeps a non-previewable attachment inert", () => {
    setAttachment({ name: "report.pdf", type: "document" });

    const { container } = render(<Attachments />);
    const tile = container.querySelector(".aui-attachment-tile");

    expect(tile).not.toBeNull();
    expect(tile?.getAttribute("role")).toBeNull();
    expect(tile?.getAttribute("tabindex")).toBeNull();
    expect(tile?.className).not.toContain("cursor-pointer");
    expect(mocks.created).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /report\.pdf/ })).toBeNull();
  });

  it("uses the attachment name for preview and removal labels", async () => {
    setAttachment({
      file: new File(["image"], "photo.png", { type: "image/png" }),
    });

    const { container } = render(<Attachments />);
    await waitFor(() => expect(mocks.created).toHaveLength(1));

    const tile = container.querySelector(".aui-attachment-tile") as HTMLElement;
    fireEvent.click(tile);

    expect(
      await screen.findByRole("dialog", { name: "photo.png preview" }),
    ).toBeTruthy();

    cleanup();
    mocks.source = "composer";
    render(<Attachments />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remove photo.png" }),
      ).toBeTruthy(),
    );
  });
});
