import { describe, expect, it } from "vitest";
import { applyTitleStream } from "./title";

const createTextStream = (text: string) =>
  new ReadableStream({
    start(controller) {
      controller.enqueue({
        type: "part-start",
        path: [0],
        part: { type: "text" },
      });
      controller.enqueue({
        type: "text-delta",
        path: [0],
        textDelta: text,
      });
      controller.enqueue({ type: "part-finish", path: [0] });
      controller.close();
    },
  }) as never;

describe("applyTitleStream", () => {
  it("ignores an empty stream", async () => {
    const titles: (string | undefined)[] = [];

    await applyTitleStream(
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }) as never,
      async (title) => {
        titles.push(title);
      },
    );

    expect(titles).toEqual([]);
  });

  it("ignores whitespace-only titles", async () => {
    const titles: (string | undefined)[] = [];

    await applyTitleStream(createTextStream("   "), async (title) => {
      titles.push(title);
    });

    expect(titles).toEqual([]);
  });

  it("forwards titles containing text unchanged", async () => {
    const titles: (string | undefined)[] = [];

    await applyTitleStream(
      createTextStream(" Generated title "),
      async (title) => {
        titles.push(title);
      },
    );

    expect(titles).toContain(" Generated title ");
  });
});
