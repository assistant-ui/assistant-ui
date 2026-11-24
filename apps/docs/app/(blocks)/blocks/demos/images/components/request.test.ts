import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { createRequestBody } from "./request";

const user = (id: string, text: string): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});

const reply = (id: string, ...urls: string[]): UIMessage => ({
  id,
  role: "assistant",
  parts: urls.map((url) => ({ type: "file", url, mediaType: "image/webp" })),
});

const menu = { custom: { count: "4", orientation: "1:1" } };
const edit = {
  custom: {
    count: "1",
    orientation: "1:1",
    background: "transparent",
    edit: "mask",
  },
};

type Trigger = "submit-message" | "regenerate-message";

function request(
  prepare: ReturnType<typeof createRequestBody>,
  messages: UIMessage[],
  trigger: Trigger,
  requestMetadata: unknown,
) {
  return prepare({
    id: "chat",
    messages,
    trigger,
    messageId: undefined,
    requestMetadata,
    body: undefined,
    credentials: undefined,
    headers: undefined,
    api: "/blocks/demos/images/api/chat",
  }) as { body: { messages: UIMessage[]; metadata: unknown } };
}

describe("createRequestBody", () => {
  it("sends only the newest picture and the newest request", () => {
    const prepare = createRequestBody();

    const { body } = request(
      prepare,
      [
        user("u1", "a fox"),
        reply(
          "a1",
          "data:image/webp;base64,T0xE",
          "data:image/webp;base64,TkVX",
        ),
        user("u2", "at night"),
      ],
      "submit-message",
      menu,
    );

    expect(body.messages).toEqual([
      reply("a1", "data:image/webp;base64,TkVX"),
      user("u2", "at night"),
    ]);
    expect(body.metadata).toBe(menu);
  });

  it("makes an editor change again with the settings it was sent with", () => {
    const prepare = createRequestBody();
    const sent = [
      user("u1", "a fox"),
      reply("a1", "x"),
      user("u2", "remove it"),
    ];
    request(prepare, sent, "submit-message", edit);

    const { body } = request(prepare, sent, "regenerate-message", menu);

    expect(body.metadata).toBe(edit);
  });

  it("makes an ordinary request again with what the menu holds now", () => {
    const prepare = createRequestBody();
    const sent = [user("u1", "a fox")];
    request(prepare, sent, "submit-message", { custom: { count: "1" } });

    const { body } = request(prepare, sent, "regenerate-message", menu);

    expect(body.metadata).toBe(menu);
  });
});
