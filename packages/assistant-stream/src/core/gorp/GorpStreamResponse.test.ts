import { describe, expect, it, vi } from "vitest";
import { fromGorpStreamResponse } from "./GorpStreamResponse";

const createResponse = (contentType?: string) => {
  const headers = new Headers({
    "Assistant-Stream-Format": "object-stream/v0",
  });
  if (contentType) headers.set("Content-Type", contentType);

  return new Response(new Uint8Array(), { headers });
};

const createTrackedResponse = ({
  status = 200,
  contentType,
  streamFormat = "object-stream/v0",
}: {
  status?: number;
  contentType?: string;
  streamFormat?: string;
} = {}) => {
  const headers = new Headers({ "Assistant-Stream-Format": streamFormat });
  if (contentType) headers.set("Content-Type", contentType);
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({ cancel });

  return { response: new Response(body, { status, headers }), cancel };
};

describe("fromGorpStreamResponse", () => {
  it.each([
    "text/event-stream",
    "text/event-stream; charset=utf-8",
    "Text/Event-Stream; Charset=UTF-8",
  ])("accepts the event-stream content type %s", (contentType) => {
    expect(() =>
      fromGorpStreamResponse(createResponse(contentType)),
    ).not.toThrow();
  });

  it.each([undefined, "application/json", "text/event-streaming"])(
    "rejects the content type %s",
    (contentType) => {
      expect(() => fromGorpStreamResponse(createResponse(contentType))).toThrow(
        "Response is not an event stream",
      );
    },
  );

  it.each([
    ["non-ok", { status: 500 }, "Response failed, status 500"],
    [
      "invalid media type",
      { contentType: "application/json" },
      "Response is not an event stream",
    ],
    [
      "unsupported format",
      { contentType: "text/event-stream", streamFormat: "object-stream/v1" },
      "Unsupported Assistant-Stream-Format header",
    ],
  ] as const)("cancels the body for a %s response", (_, options, message) => {
    const { response, cancel } = createTrackedResponse(options);

    expect(() => fromGorpStreamResponse(response)).toThrow(message);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
