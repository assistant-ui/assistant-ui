import { describe, expect, it } from "vitest";
import { fromObjectStreamResponse } from "./ObjectStreamResponse";

const createResponse = (contentType?: string) => {
  const headers = new Headers({
    "Assistant-Stream-Format": "object-stream/v0",
  });
  if (contentType) headers.set("Content-Type", contentType);

  return new Response(new Uint8Array(), { headers });
};

describe("fromObjectStreamResponse", () => {
  it.each([
    "text/event-stream",
    "text/event-stream; charset=utf-8",
    "Text/Event-Stream; Charset=UTF-8",
  ])("accepts the event-stream content type %s", (contentType) => {
    expect(() =>
      fromObjectStreamResponse(createResponse(contentType)),
    ).not.toThrow();
  });

  it.each([undefined, "application/json", "text/event-streaming"])(
    "rejects the content type %s",
    (contentType) => {
      expect(() =>
        fromObjectStreamResponse(createResponse(contentType)),
      ).toThrow("Response is not an event stream");
    },
  );
});
