import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";

const mockUseAui = vi.fn();
const mockUseAuiState = vi.fn();
const mockUseFocus = vi.fn();

type UseAuiStateSelector = Parameters<
  (typeof import("@assistant-ui/store"))["useAuiState"]
>[0];

type InputHandler = (
  input: string,
  key: { return?: boolean; ctrl?: boolean; meta?: boolean },
) => void;

let inputHandler: InputHandler | undefined;

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => mockUseAui(),
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => mockUseFocus(),
    useInput: (handler: InputHandler) => {
      inputHandler = handler;
    },
  };
});

import { AttachmentThumb } from "../primitives/attachment/AttachmentThumb";
import { AttachmentRoot } from "../primitives/attachment/AttachmentRoot";
import { AttachmentName } from "../primitives/attachment/AttachmentName";
import { AttachmentRemove } from "../primitives/attachment/AttachmentRemove";
import { AttachmentStatus } from "../primitives/attachment/AttachmentStatus";

const setAttachmentState = (attachment: unknown) => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ attachment } as never),
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  inputHandler = undefined;
});

describe("AttachmentPrimitive.Root", () => {
  it("renders children inside a Box", () => {
    const { lastFrame } = render(
      <AttachmentRoot>
        <Text>inner</Text>
      </AttachmentRoot>,
    );
    expect(lastFrame()).toContain("inner");
  });
});

describe("AttachmentPrimitive.Name", () => {
  it("renders the attachment name from store state", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "report.pdf",
      status: { type: "complete" },
    });
    const { lastFrame } = render(<AttachmentName />);
    expect(lastFrame()).toContain("report.pdf");
  });
});

describe("AttachmentPrimitive.Remove", () => {
  it("calls aui.attachment().remove() on Enter when focused", () => {
    mockUseFocus.mockReturnValue({ isFocused: true });
    const remove = vi.fn();
    mockUseAui.mockReturnValue({ attachment: () => ({ remove }) });
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "report.pdf",
      status: { type: "complete" },
    });
    render(
      <AttachmentRemove>
        <Text>[x]</Text>
      </AttachmentRemove>,
    );
    inputHandler?.("", { return: true });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("AttachmentPrimitive.Thumb", () => {
  it("renders the file extension when present", () => {
    setAttachmentState({
      id: "a1",
      type: "document",
      name: "spec.pdf",
      status: { type: "complete" },
    });
    const { lastFrame } = render(<AttachmentThumb />);
    expect(lastFrame()).toContain(".pdf");
  });

  it("falls back to the attachment type when the name has no extension", () => {
    setAttachmentState({
      id: "a1",
      type: "image",
      name: "screenshot",
      status: { type: "complete" },
    });
    const { lastFrame } = render(<AttachmentThumb />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("image");
    expect(frame).not.toMatch(/^\s*\.\s*$/);
  });

  it("falls back to 'file' when neither extension nor type is informative", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "noextension",
      status: { type: "complete" },
    });
    const { lastFrame } = render(<AttachmentThumb />);
    expect(lastFrame()).toContain("file");
  });

  it("treats a leading-dot filename as extensionless and falls back to type", () => {
    setAttachmentState({
      id: "a1",
      type: "document",
      name: ".env",
      status: { type: "complete" },
    });
    const { lastFrame } = render(<AttachmentThumb />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("document");
    expect(frame).not.toContain(".env");
  });

  it("treats a trailing-dot filename as extensionless and falls back to type", () => {
    setAttachmentState({
      id: "a1",
      type: "image",
      name: "report.",
      status: { type: "complete" },
    });
    const { lastFrame } = render(<AttachmentThumb />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("image");
    expect(frame).not.toMatch(/\.\s*$/);
  });
});

describe("AttachmentPrimitive.Status", () => {
  it("renders an uploading label with progress percent for running/uploading", () => {
    setAttachmentState({
      id: "a1",
      type: "image",
      name: "screenshot.png",
      status: { type: "running", reason: "uploading", progress: 0.42 },
    });
    const { lastFrame } = render(<AttachmentStatus />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("uploading");
    expect(frame).toContain("42%");
  });

  it("renders an error marker for incomplete/error", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "broken.bin",
      status: { type: "incomplete", reason: "error" },
    });
    const { lastFrame } = render(<AttachmentStatus />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("x");
    expect(frame).toContain("error");
  });

  it("renders the failure message when the error status carries one", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "broken.bin",
      status: {
        type: "incomplete",
        reason: "error",
        message: "Failed to upload file: 403 Forbidden",
      },
    });
    const { lastFrame } = render(<AttachmentStatus />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("x error: Failed to upload file: 403 Forbidden");
  });

  it("renders a paused marker for incomplete/upload-paused", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "doc.txt",
      status: { type: "incomplete", reason: "upload-paused" },
    });
    const { lastFrame } = render(<AttachmentStatus />);
    expect(lastFrame()).toContain("paused");
  });

  it("renders a needs-action marker for requires-action/composer-send", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "doc.txt",
      status: { type: "requires-action", reason: "composer-send" },
    });
    const { lastFrame } = render(<AttachmentStatus />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("?");
  });

  it("renders nothing by default for complete", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "doc.txt",
      status: { type: "complete" },
    });
    const { lastFrame } = render(<AttachmentStatus />);
    expect((lastFrame() ?? "").trim()).toBe("");
  });

  it("renders a complete marker when showComplete is set", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "doc.txt",
      status: { type: "complete" },
    });
    const { lastFrame } = render(<AttachmentStatus showComplete />);
    expect(lastFrame()).toContain("+");
  });

  it("accepts a caller-supplied color without crashing", () => {
    setAttachmentState({
      id: "a1",
      type: "file",
      name: "broken.bin",
      status: { type: "incomplete", reason: "error" },
    });
    const { lastFrame } = render(<AttachmentStatus color="blue" />);
    expect(lastFrame()).toContain("error");
  });
});
