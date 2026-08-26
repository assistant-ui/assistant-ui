import { cleanup, render, waitFor } from "@testing-library/react";
import {
  cloneElement,
  isValidElement,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComposerAttachments } from "./attachment";

const mocks = vi.hoisted(() => ({
  file: undefined as File | undefined,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  const Passthrough = ({ children }: PropsWithChildren) => children;

  return {
    ...original,
    useAui: () => ({ attachment: { source: "message" } }),
    useAuiState: (
      selector: (state: {
        attachment: {
          type: "image";
          file?: File;
          content: never[];
          status: { type: "complete" };
        };
      }) => unknown,
    ) =>
      selector({
        attachment: {
          type: "image",
          ...(mocks.file ? { file: mocks.file } : {}),
          content: [],
          status: { type: "complete" },
        },
      }),
    AttachmentPrimitive: {
      ...original.AttachmentPrimitive,
      Root: Passthrough,
      Name: () => null,
    },
    ComposerPrimitive: {
      ...original.ComposerPrimitive,
      Attachments: ({ children }: { children: () => ReactNode }) => children(),
    },
  };
});

vi.mock("@/components/ui/tooltip", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/components/ui/tooltip")>();
  const Passthrough = ({ children }: PropsWithChildren) => children;

  return {
    ...original,
    Tooltip: Passthrough,
    TooltipContent: Passthrough,
    TooltipProvider: Passthrough,
    TooltipTrigger: ({
      children,
      render: trigger,
    }: PropsWithChildren<{ render?: ReactElement }>) =>
      isValidElement(trigger)
        ? cloneElement(trigger, undefined, children)
        : children,
  };
});

vi.mock("@/components/ui/dialog", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/components/ui/dialog")>();
  const Passthrough = ({ children }: PropsWithChildren) => children;

  return {
    ...original,
    Dialog: Passthrough,
    DialogContent: () => null,
    DialogTitle: Passthrough,
    DialogTrigger: ({ render: trigger }: { render?: ReactElement }) => trigger,
  };
});

vi.mock("@/components/ui/avatar", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/components/ui/avatar")>();
  const Passthrough = ({ children }: PropsWithChildren) => children;

  return {
    ...original,
    Avatar: Passthrough,
    AvatarFallback: Passthrough,
    AvatarImage: (props: React.ComponentProps<"img">) => <img {...props} />,
  };
});

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  let nextUrl = 1;
  mocks.file = undefined;
  URL.createObjectURL = vi.fn(() => `blob:test-${nextUrl++}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe("ComposerAttachments", () => {
  it("replaces and revokes object URLs when the file changes", async () => {
    mocks.file = new File(["first"], "first.png", { type: "image/png" });
    const { rerender, unmount } = render(<ComposerAttachments />);

    const getImage = () =>
      document.querySelector<HTMLImageElement>('img[alt="Attachment preview"]');
    await waitFor(() => {
      const element = getImage();
      expect(element?.src).toContain("blob:test-");
    });
    const firstSrc = getImage()!.src;
    const initialUrls = vi
      .mocked(URL.createObjectURL)
      .mock.results.map(({ value }) => value);

    mocks.file = new File(["second"], "second.png", {
      type: "image/png",
    });
    rerender(<ComposerAttachments />);

    await waitFor(() => expect(getImage()?.src).not.toBe(firstSrc));
    for (const url of initialUrls) {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    }

    unmount();

    for (const { value: url } of vi.mocked(URL.createObjectURL).mock.results) {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    }
  });
});
