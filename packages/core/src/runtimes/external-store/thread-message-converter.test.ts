import { describe, expect, it, vi } from "vitest";
import { fromThreadMessageLike } from "../../runtime/utils/thread-message-like";
import { ThreadMessageConverter } from "./thread-message-converter";

describe("ThreadMessageConverter", () => {
  it("reuses an unchanged prefix while converting the changed tail", () => {
    const converter = new ThreadMessageConverter();
    const inputs = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const convert = vi.fn(
      (_cached: unknown, message: { id: string }, idx: number) =>
        fromThreadMessageLike(
          { id: message.id, role: "user", content: String(idx) },
          message.id,
          { type: "complete", reason: "unknown" },
        ),
    );

    const first = converter.convertMessages(inputs, convert, true);
    const second = converter.convertMessages(
      [...inputs.slice(0, 2), { id: "next" }],
      convert,
      true,
    );

    expect(convert).toHaveBeenCalledTimes(4);
    expect(second[0]).toBe(first[0]);
    expect(second[1]).toBe(first[1]);
    expect(second[2]?.id).toBe("next");
  });

  it("keeps its prefix private from mutations of the returned array", () => {
    const converter = new ThreadMessageConverter();
    const inputs = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const convert = (_cached: unknown, message: { id: string }) =>
      fromThreadMessageLike(
        { id: message.id, role: "user", content: message.id },
        message.id,
        { type: "complete", reason: "unknown" },
      );

    const first = converter.convertMessages(inputs, convert, true);
    first[0] = first[2]!;
    const second = converter.convertMessages(
      [...inputs.slice(0, 2), { id: "next" }],
      convert,
      true,
    );

    expect(second.map((message) => message.id)).toEqual(["a", "b", "next"]);
  });

  it("reconverts the former tail when a message is appended", () => {
    const converter = new ThreadMessageConverter();
    const inputs = [{ id: "a" }, { id: "b" }];
    const convert =
      (length: number) =>
      (_cached: unknown, message: { id: string }, idx: number) =>
        fromThreadMessageLike(
          { id: message.id, role: "assistant", content: message.id },
          message.id,
          idx === length - 1
            ? { type: "running" }
            : { type: "complete", reason: "unknown" },
        );

    const first = converter.convertMessages(inputs, convert(2), true);
    const second = converter.convertMessages(
      [...inputs, { id: "c" }],
      convert(3),
      true,
    );

    expect(first[1]?.status?.type).toBe("running");
    expect(second[1]?.status?.type).toBe("complete");
  });

  it("keeps the original full-conversion behavior unless prefix reuse is requested", () => {
    const converter = new ThreadMessageConverter();
    const input = { id: "a" };
    const convert = vi.fn((_cached: unknown, message: { id: string }) =>
      fromThreadMessageLike(
        { id: message.id, role: "user", content: message.id },
        message.id,
        { type: "complete", reason: "unknown" },
      ),
    );

    converter.convertMessages([input, input], convert);
    converter.convertMessages([input, input], convert);

    expect(convert).toHaveBeenCalledTimes(4);

    converter.convertMessages([input, input], convert, true);
    expect(convert).toHaveBeenCalledTimes(6);
    converter.convertMessages([input, input], convert, true);
    expect(convert).toHaveBeenCalledTimes(7);
  });
});
