import { describe, it, expect } from "vitest";
import { unstable_defaultDirectiveFormatter } from "../adapters/directive-formatter";

describe("unstable_defaultDirectiveFormatter", () => {
  describe("serialize", () => {
    it("serializes with id === label (no name attr)", () => {
      expect(
        unstable_defaultDirectiveFormatter.serialize({
          id: "weather",
          type: "tool",
          label: "weather",
        }),
      ).toBe(":tool[weather]");
    });

    it("serializes with id !== label (includes name attr)", () => {
      expect(
        unstable_defaultDirectiveFormatter.serialize({
          id: "get_weather",
          type: "tool",
          label: "Weather",
        }),
      ).toBe(":tool[Weather]{name=get_weather}");
    });
  });

  describe("parse", () => {
    it("parses plain text", () => {
      expect(unstable_defaultDirectiveFormatter.parse("hello world")).toEqual([
        { kind: "text", text: "hello world" },
      ]);
    });

    it("parses a single directive without name attr", () => {
      expect(
        unstable_defaultDirectiveFormatter.parse("use :tool[weather] please"),
      ).toEqual([
        { kind: "text", text: "use " },
        { kind: "mention", type: "tool", label: "weather", id: "weather" },
        { kind: "text", text: " please" },
      ]);
    });

    it("parses a directive with name attr", () => {
      expect(
        unstable_defaultDirectiveFormatter.parse(
          ":tool[Weather]{name=get_weather}",
        ),
      ).toEqual([
        {
          kind: "mention",
          type: "tool",
          label: "Weather",
          id: "get_weather",
        },
      ]);
    });

    it("parses multiple directives in text", () => {
      const result = unstable_defaultDirectiveFormatter.parse(
        ":tool[a] and :tool[b]{name=bb}",
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        kind: "mention",
        type: "tool",
        label: "a",
        id: "a",
      });
      expect(result[1]).toEqual({ kind: "text", text: " and " });
      expect(result[2]).toEqual({
        kind: "mention",
        type: "tool",
        label: "b",
        id: "bb",
      });
    });

    it("parses hyphenated types", () => {
      expect(
        unstable_defaultDirectiveFormatter.parse(
          ":data-source[My DB]{name=db_1}",
        ),
      ).toEqual([
        {
          kind: "mention",
          type: "data-source",
          label: "My DB",
          id: "db_1",
        },
      ]);
    });

    it("roundtrips serialize → parse", () => {
      const item = {
        id: "get_weather",
        type: "tool",
        label: "Weather",
      };
      const serialized = unstable_defaultDirectiveFormatter.serialize(item);
      const parsed = unstable_defaultDirectiveFormatter.parse(serialized);
      expect(parsed).toEqual([
        {
          kind: "mention",
          type: "tool",
          label: "Weather",
          id: "get_weather",
        },
      ]);
    });
  });

  describe("unicode support", () => {
    it("serializes a directive with a CJK label", () => {
      expect(
        unstable_defaultDirectiveFormatter.serialize({
          id: "天气",
          type: "tool",
          label: "天气",
        }),
      ).toBe(":tool[天气]");
    });

    it("parses a directive with a CJK label and name attr", () => {
      expect(
        unstable_defaultDirectiveFormatter.parse(":tool[天气]{name=w1}"),
      ).toEqual([
        {
          kind: "mention",
          type: "tool",
          label: "天气",
          id: "w1",
        },
      ]);
    });
  });
});
