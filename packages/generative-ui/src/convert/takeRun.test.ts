import { describe, expect, it } from "vitest";
import type { NormalizedUIElement, NormalizedUINode } from "../ir";
import { takeRun } from "./takeRun";

const element = (type: string): NormalizedUIElement => ({ type, props: {} });

const isFact = (candidate: NormalizedUIElement) => candidate.type === "Fact";

describe("takeRun", () => {
  it("collects the contiguous matching run and reports the resume index", () => {
    const fact = element("Fact");
    const nodes = [fact, fact, element("Text"), fact];

    expect(takeRun(nodes, 0, isFact)).toEqual({ run: [fact, fact], next: 2 });
  });

  it("starts at the given index rather than the head of the list", () => {
    const fact = element("Fact");
    const nodes = [element("Text"), fact, fact];

    expect(takeRun(nodes, 1, isFact)).toEqual({ run: [fact, fact], next: 3 });
  });

  it("stops at the end of the list", () => {
    const fact = element("Fact");

    expect(takeRun([fact, fact], 0, isFact)).toEqual({
      run: [fact, fact],
      next: 2,
    });
  });

  it("returns an empty run without advancing when the first node does not match", () => {
    expect(takeRun([element("Text"), element("Fact")], 0, isFact)).toEqual({
      run: [],
      next: 0,
    });
  });

  it("stops on every non-element node shape", () => {
    const fact = element("Fact");
    const nonElements: (NormalizedUINode | undefined)[] = [
      undefined,
      null,
      "",
      "text",
      0,
      1,
      [],
      [fact],
    ];

    for (const nonElement of nonElements) {
      expect(takeRun([fact, nonElement, fact], 0, isFact)).toEqual({
        run: [fact],
        next: 1,
      });
    }
  });

  it("stops past the end of the list", () => {
    expect(takeRun([element("Fact")], 1, isFact)).toEqual({ run: [], next: 1 });
  });
});
