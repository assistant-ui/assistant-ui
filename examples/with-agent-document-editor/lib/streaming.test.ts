import { describe, expect, it } from "vitest";
import type { Block } from "./document-state";
import {
  advance,
  displayBlocks,
  receive,
  remaining,
  settled,
  streamMarks,
  type Stream,
} from "./streaming";

const PAGE: Block[] = [
  { id: "b1", type: "h1", text: "Title" },
  { id: "b2", type: "paragraph", text: "The old paragraph, which is long." },
  { id: "b3", type: "paragraph", text: "Last words." },
];

const withBlock = (id: string, text: string) =>
  PAGE.map((block) => (block.id === id ? { ...block, text } : block));

const typeAll = (stream: Stream) => {
  let current = stream;
  while (remaining(current) > 0) current = advance(current, 4);
  return current;
};

describe("receive", () => {
  it("takes a change as it is when the assistant is not writing", () => {
    const next = withBlock("b2", "Restored.");
    const stream = receive(settled(PAGE), next, false);
    expect(displayBlocks(stream)).toEqual(next);
    expect(stream.active).toBe(false);
  });

  it("keeps the old text while the new text for a block arrives", () => {
    let stream = settled(PAGE);
    for (const partial of ["The", "The new", "The new para"]) {
      stream = receive(stream, withBlock("b2", partial), true);
      expect(displayBlocks(stream)).toEqual(PAGE);
    }
    expect(streamMarks(stream).working).toEqual(["b2"]);
  });

  it("does not mark a block whose text is the same so far", () => {
    const stream = receive(settled(PAGE), withBlock("b2", "The old par"), true);
    expect(displayBlocks(stream)).toEqual(PAGE);
    expect(streamMarks(stream)).toEqual({ working: [], empty: [] });
  });

  it("types the new text over the old once it is whole", () => {
    const final = withBlock("b2", "The new paragraph.");
    let stream = receive(settled(PAGE), withBlock("b2", "The new para"), true);
    stream = receive(stream, final, true);
    stream = receive(stream, final, false);

    // "The " is shared, so typing starts after it and the old text follows.
    expect(streamMarks(stream).typing).toEqual({ id: "b2", typed: 4 });
    expect(displayBlocks(stream)[1]?.text).toBe(
      "The old paragraph, which is long.",
    );

    stream = advance(stream, 3);
    expect(streamMarks(stream).typing).toEqual({ id: "b2", typed: 7 });
    expect(displayBlocks(stream)[1]?.text).toBe(
      "The new paragraph, which is long.",
    );

    stream = typeAll(stream);
    expect(displayBlocks(stream)).toEqual(final);
    expect(stream.active).toBe(false);
  });

  it("starts typing a block as soon as the assistant moves to the next", () => {
    const first = withBlock("b2", "Rewritten.");
    let stream = receive(settled(PAGE), first, true);
    expect(streamMarks(stream).typing).toBeUndefined();

    const second = first.map((block) =>
      block.id === "b3" ? { ...block, text: "New" } : block,
    );
    stream = receive(stream, second, true);
    expect(streamMarks(stream)).toEqual({
      working: ["b3"],
      empty: [],
      typing: { id: "b2", typed: 0 },
    });
  });

  it("keeps formatting whole while a block is half typed", () => {
    const final = withBlock("b2", "A **bold** claim about speed.");
    let stream = receive(settled(PAGE), final, true);
    stream = advance(receive(stream, final, false), 4);
    expect(displayBlocks(stream)[1]?.text).toBe(
      "A **bo**old paragraph, which is long.",
    );
  });

  it("changes a block's type without typing anything", () => {
    const final = PAGE.map((block) =>
      block.id === "b2" ? { ...block, type: "quote" as const } : block,
    );
    const stream = receive(receive(settled(PAGE), final, true), final, false);
    expect(displayBlocks(stream)).toEqual(final);
    expect(stream.active).toBe(false);
  });

  it("leaves blocks a replaced list has not reached, then drops removed ones", () => {
    const inserted: Block = { id: "n1", type: "paragraph", text: "New here." };
    const list = [PAGE[0]!, inserted, PAGE[1]!];

    let stream = receive(settled(PAGE), [PAGE[0]!], true);
    expect(displayBlocks(stream)).toEqual(PAGE);

    stream = receive(stream, [PAGE[0]!, { id: "n1", type: "paragraph" }], true);
    expect(displayBlocks(stream)).toEqual(PAGE);

    stream = receive(stream, [PAGE[0]!, { ...inserted, text: "New" }], true);
    expect(displayBlocks(stream).map((block) => block.id)).toEqual([
      "b1",
      "n1",
      "b2",
      "b3",
    ]);
    expect(streamMarks(stream).empty).toEqual(["n1"]);

    stream = receive(stream, list, true);
    stream = typeAll(receive(stream, list, false));
    expect(displayBlocks(stream)).toEqual(list);
    expect(stream.active).toBe(false);
  });

  it("ignores an id that is still arriving", () => {
    const stream = receive(settled(PAGE), [PAGE[0]!, { id: "b" }], true);
    expect(displayBlocks(stream)).toEqual(PAGE);
  });

  it("gives an added block its id when the call ends", () => {
    const partial = [...PAGE, { type: "paragraph" as const, text: "Added" }];
    let stream = receive(settled(PAGE), partial, true);
    expect(streamMarks(stream).empty).toEqual(["streaming-3"]);

    const final = [
      ...PAGE,
      { id: "b9", type: "paragraph" as const, text: "Added text." },
    ];
    stream = receive(stream, final, false);
    expect(displayBlocks(stream).map((block) => block.id)).toEqual([
      "b1",
      "b2",
      "b3",
      "b9",
    ]);
    expect(displayBlocks(typeAll(stream))).toEqual(final);
  });
});
