import { describe, expect, it, vi } from "vitest";
import { createTapRoot } from "@assistant-ui/tap";
import { useChat } from "@ai-sdk/react";
import { createControlledTransport } from "./__tests__/controlled-transport";

describe("useChat hosted in a tap root", () => {
  it("streams a full round trip without React", async () => {
    const { transport, emit, close } = createControlledTransport();
    const root = createTapRoot(function UseChatOnTap() {
      return useChat({ transport });
    });

    try {
      expect(root.getValue().status).toBe("ready");
      expect(root.getValue().messages).toHaveLength(0);

      const sendPromise = root.getValue().sendMessage({ text: "hi" });
      await vi.waitFor(() => {
        expect(root.getValue().status).toBe("submitted");
        expect(root.getValue().messages).toHaveLength(1);
      });

      emit(
        { type: "start" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "hello " },
      );
      await vi.waitFor(() => {
        expect(root.getValue().status).toBe("streaming");
        const parts = root.getValue().messages.at(-1)?.parts;
        expect(parts).toContainEqual(
          expect.objectContaining({ type: "text", text: "hello " }),
        );
      });

      emit(
        { type: "text-delta", id: "t1", delta: "world" },
        { type: "text-end", id: "t1" },
        { type: "finish" },
      );
      close();
      await sendPromise;

      await vi.waitFor(() => {
        expect(root.getValue().status).toBe("ready");
        const { messages } = root.getValue();
        expect(messages).toHaveLength(2);
        expect(messages[0]!.role).toBe("user");
        expect(messages[1]!.role).toBe("assistant");
        expect(messages[1]!.parts).toContainEqual(
          expect.objectContaining({ type: "text", text: "hello world" }),
        );
      });
    } finally {
      root.unmount();
    }
  });
});
