import { describe, expect, it } from "vitest";
import {
  validateDocChatRequestInput,
  validateFrontendToolsInput,
} from "./validate-input";

const messagesAtSerializedLength = (length: number) => {
  const message = { role: "user", content: "" };
  const wrapperLength = JSON.stringify(message).length;
  message.content = "x".repeat(length - wrapperLength);
  expect(JSON.stringify(message)).toHaveLength(length);
  return [message];
};

const toolsAtSerializedLength = (length: number) => {
  const tools = {
    search: {
      description: "",
      parameters: { type: "object", properties: {} },
    },
  };
  const wrapperLength = JSON.stringify(tools).length;
  tools.search.description = "x".repeat(length - wrapperLength);
  expect(JSON.stringify(tools)).toHaveLength(length);
  return tools;
};

describe("validateFrontendToolsInput", () => {
  it("accepts a bounded frontend tool definition", () => {
    expect(
      validateFrontendToolsInput({
        search: {
          description: "Search documentation",
          parameters: { type: "object", properties: {} },
        },
      }),
    ).toBeNull();
  });

  it("accepts frontend tools at the exact request budget", () => {
    expect(
      validateFrontendToolsInput(toolsAtSerializedLength(96_000)),
    ).toBeNull();
  });

  it("rejects frontend tool definitions that exceed the request budget", async () => {
    const response = validateFrontendToolsInput(
      toolsAtSerializedLength(96_001),
    );

    expect(response?.status).toBe(400);
    await expect(response?.text()).resolves.toBe("Tools too large");
  });

  it.each(["search", []])("rejects malformed frontend tools", async (tools) => {
    const response = validateFrontendToolsInput(tools);

    expect(response?.status).toBe(400);
    await expect(response?.text()).resolves.toBe("Invalid tools format");
  });
});

describe("validateDocChatRequestInput", () => {
  it("accepts raw history at the request boundary", () => {
    expect(
      validateDocChatRequestInput(messagesAtSerializedLength(4_000_000)),
    ).toBeNull();
  });

  it("rejects raw history above the request boundary", async () => {
    const response = validateDocChatRequestInput(
      messagesAtSerializedLength(4_000_001),
    );

    expect(response?.status).toBe(400);
    await expect(response?.text()).resolves.toBe("Request too large");
  });
});
