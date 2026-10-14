import { createTapRoot } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import { useMcpElicitationLifecycle } from "./McpElicitationLifecycle";

describe("useMcpElicitationLifecycle", () => {
  it("validates accepted content before resolving the request", async () => {
    const root = createTapRoot(function Root() {
      return useMcpElicitationLifecycle();
    });
    const requestedSchema = {
      type: "object" as const,
      properties: { answer: { type: "string" as const } },
    };

    try {
      const response = root.getValue().requestElicitation(
        {
          method: "elicitation/create",
          params: { message: "Answer", requestedSchema },
        },
        new AbortController().signal,
        () => true,
      );
      await vi.waitFor(() =>
        expect(root.getValue().pendingElicitations).toHaveLength(1),
      );
      const id = root.getValue().pendingElicitations[0]!.id;

      expect(
        root.getValue().answerElicitation(id, {
          action: "accept",
          content: { answer: 42 },
        }),
      ).toEqual([{ property: "answer", message: "Expected a string." }]);
      await vi.waitFor(() =>
        expect(
          root.getValue().pendingElicitations[0]?.error?.properties,
        ).toEqual(["answer"]),
      );

      expect(
        root.getValue().answerElicitation(id, {
          action: "accept",
          content: { answer: "yes" },
        }),
      ).toBeUndefined();
      await expect(response).resolves.toEqual({
        action: "accept",
        content: { answer: "yes" },
      });
    } finally {
      root.unmount();
    }
  });

  it("cancels a request when its signal aborts", async () => {
    const root = createTapRoot(function Root() {
      return useMcpElicitationLifecycle();
    });
    const controller = new AbortController();

    try {
      const response = root.getValue().requestElicitation(
        {
          method: "elicitation/create",
          params: {
            message: "Answer",
            requestedSchema: { type: "object", properties: {} },
          },
        },
        controller.signal,
        () => true,
      );
      controller.abort();
      await expect(response).resolves.toEqual({ action: "cancel" });
      await vi.waitFor(() =>
        expect(root.getValue().pendingElicitations).toHaveLength(0),
      );
    } finally {
      root.unmount();
    }
  });
});
