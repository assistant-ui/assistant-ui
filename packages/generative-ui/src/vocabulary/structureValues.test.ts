import { describe, expect, it } from "vitest";
import {
  linkHost,
  linkHref,
  sequenceItems,
  tabLabels,
} from "./structureValues";

describe("linkHref", () => {
  it.each([
    "https://www.parktool.com/en-us/blog/repair-help?x=1#tube",
    "http://example.com:8080/a%20b",
    "HTTPS://Example.COM",
  ])("opens %s", (url) => {
    expect(linkHref(url)).toBe(url);
  });

  it.each([
    "javascript:alert(1)",
    "ftp://example.com/file",
    "https://good.com\\@evil.com/path",
    "https://user@example.com/",
    "https://bad host/path",
    "https://example.com/a b",
    " https://example.com",
    "https://",
    "https://-bad.com",
    "https://example.com:65536/",
  ])("refuses %s", (url) => {
    expect(linkHref(url)).toBeUndefined();
  });
});

it("linkHost names the host without www", () => {
  expect(linkHost("https://WWW.ParkTool.com/en-us")).toBe("parktool.com");
  expect(linkHost("http://example.com:8080/a")).toBe("example.com");
});

it("tabLabels reads strings and A2UI title entries, numbering the rest", () => {
  expect(
    tabLabels(["Day 1", { title: "Day 2", child: "b" }, { child: "c" }, 4], 5),
  ).toEqual(["Day 1", "Day 2", "3", "4", "5"]);
});

it("sequenceItems keeps entries with a title and reads numbers as text", () => {
  expect(
    sequenceItems([
      { title: "Step", detail: 2, time: 1969 },
      { detail: "no title" },
      null,
    ]),
  ).toEqual([{ title: "Step", detail: "2", time: "1969" }]);
});
