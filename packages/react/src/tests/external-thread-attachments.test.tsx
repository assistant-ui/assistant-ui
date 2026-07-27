// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import type { ExternalThreadProps } from "../client/ExternalThread";
import { ExternalThread } from "../client/ExternalThread";

const renderThreadWithProps = (props: Partial<ExternalThreadProps>) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const aui = useAui({
      thread: ExternalThread({ messages: [], isRunning: false, ...props }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };

  render(<App />);
  return () => captured.aui!;
};

const renderThread = () => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const aui = useAui({
      thread: ExternalThread({ messages: [], isRunning: false }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };

  render(<App />);
  return () => captured.aui!;
};

describe("ExternalThread attachments", () => {
  it("adds prepared attachments when File is unavailable", async () => {
    const aui = renderThread();
    const fileConstructor = globalThis.File;
    vi.stubGlobal("File", undefined);

    try {
      await act(async () => {
        await aui()
          .thread()
          .composer()
          .addAttachment({
            name: "notes.txt",
            contentType: "text/plain",
            content: [{ type: "text", text: "hello" }],
          });
      });
    } finally {
      vi.stubGlobal("File", fileConstructor);
    }

    await waitFor(() => {
      expect(aui().thread().composer().getState().attachments[0]).toMatchObject(
        {
          type: "document",
          name: "notes.txt",
          contentType: "text/plain",
          content: [{ type: "text", text: "hello" }],
        },
      );
    });
  });

  it("preserves foreign files that expose content", async () => {
    const aui = renderThread();
    const foreignFile = {
      name: "photo.png",
      type: "image/png",
      lastModified: 0,
      content: [{ type: "text", text: "implementation detail" }],
    } as File;

    await act(() => aui().thread().composer().addAttachment(foreignFile));

    expect(aui().thread().composer().getState().attachments[0]).toMatchObject({
      type: "file",
      name: "photo.png",
      contentType: "image/png",
      file: foreignFile,
    });
  });

  it("restores the draft when an attachment upload fails on send", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const sent: unknown[] = [];
    let rejectSend!: (reason: unknown) => void;
    const adapter = {
      accept: "*",
      add: async ({ file }: { file: File }) => ({
        id: "att-1",
        type: "file" as const,
        name: file.name,
        contentType: file.type,
        file,
        status: {
          type: "requires-action" as const,
          reason: "composer-send" as const,
        },
      }),
      send: () =>
        new Promise((_resolve, reject) => {
          rejectSend = reject;
        }) as never,
      remove: async () => {},
    };

    const aui = renderThreadWithProps({
      attachmentAdapter: adapter,
      onNew: (message) => sent.push(message),
    });

    await act(() =>
      aui()
        .thread()
        .composer()
        .addAttachment(new File(["data"], "notes.txt", { type: "text/plain" })),
    );
    await act(async () => {
      aui().thread().composer().setText("hello");
    });
    await act(async () => {
      aui().thread().composer().send();
    });

    // The draft is cleared optimistically while the upload runs.
    expect(aui().thread().composer().getState().text).toBe("");

    await act(async () => {
      rejectSend(new Error("upload failed"));
    });

    await waitFor(() => {
      const state = aui().thread().composer().getState();
      expect(state.text).toBe("hello");
      expect(state.attachments).toHaveLength(1);
    });
    expect(sent).toHaveLength(0);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to send attachments",
      expect.any(Error),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
