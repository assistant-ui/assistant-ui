import { describe, expect, it } from "vitest";
import type { AppendMessage } from "@assistant-ui/react";
import { getMessageContent } from "./getMessageContent";

describe("getMessageContent", () => {
  it("returns a string for single text messages", () => {
    const message: AppendMessage = {
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    };

    expect(getMessageContent(message)).toBe("Hello");
  });

  it("throws for unsupported component message parts", () => {
    const message: AppendMessage = {
      role: "user",
      content: [
        {
          type: "component",
          name: "status-chip",
          props: { label: "Ready" },
        },
      ],
    };

    expect(() => getMessageContent(message)).toThrow(
      "Unsupported append message part type: component",
    );
  });
});
