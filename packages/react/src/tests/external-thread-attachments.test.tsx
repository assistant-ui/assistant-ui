// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "../client/ExternalThread";

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
});
