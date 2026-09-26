import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  type ChatModelAdapter,
  useAui,
  useLocalRuntime,
} from "@assistant-ui/react";
import { useEffect, type ComponentType } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ComposerAttachments as BaseComposerAttachments } from "./attachment.aui";
import { ComposerAttachments as RadixComposerAttachments } from "./attachment.aui.radix";

const model: ChatModelAdapter = {
  async *run() {},
};

const attachmentAdapter = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleTextAttachmentAdapter(),
]);

const AddAttachment = ({ file }: { file: File }) => {
  const aui = useAui();

  useEffect(() => {
    void aui.composer.addAttachment(file);
  }, [aui, file]);

  return null;
};

const TestAttachments = ({
  file,
  Attachments,
}: {
  file: File;
  Attachments: ComponentType;
}) => {
  const runtime = useLocalRuntime(model, {
    adapters: { attachments: attachmentAdapter },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AddAttachment file={file} />
      <Attachments />
    </AssistantRuntimeProvider>
  );
};

const flavors: Array<[string, ComponentType]> = [
  ["Base", BaseComposerAttachments],
  ["Radix", RadixComposerAttachments],
];

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  let id = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => `blob:attachment-${id++}`),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(flavors)("%s attachment element", (_, Attachments) => {
  it("creates one preview URL and names the preview and remove actions", async () => {
    render(
      <TestAttachments
        file={new File(["image"], "screenshot.png", { type: "image/png" })}
        Attachments={Attachments}
      />,
    );

    const preview = await screen.findByRole("button", {
      name: "Preview screenshot.png",
    });
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(preview.className).toContain("cursor-zoom-in");
    expect(preview.className).toContain("active:scale-[0.96]");
    expect(
      screen.getByRole("button", { name: "Remove screenshot.png" }),
    ).toBeTruthy();

    fireEvent.click(preview);

    expect(
      await screen.findByRole("heading", { name: "Preview screenshot.png" }),
    ).toBeTruthy();
    expect(screen.getByAltText("Preview of screenshot.png")).toBeTruthy();
  });

  it("keeps a file without a preview out of the button interaction model", async () => {
    render(
      <TestAttachments
        file={new File(["report"], "report.txt", { type: "text/plain" })}
        Attachments={Attachments}
      />,
    );

    const tile = await screen.findByRole("group", {
      name: "Document attachment report.txt",
    });
    expect(tile.className).toContain("cursor-default");
    expect(tile.className).not.toContain("active:scale-[0.96]");
    expect(
      screen.queryByRole("button", { name: "Document attachment report.txt" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Remove report.txt" }),
    ).toBeTruthy();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
