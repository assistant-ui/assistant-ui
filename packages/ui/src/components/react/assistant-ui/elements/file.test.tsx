import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { File } from "./file";

afterEach(cleanup);

describe("File inline size", () => {
  it.each([
    ["data:text/plain,hello%20world", "11 B"],
    ["data:text/plain,hello", "5 B"],
    ["data:,", "0 B"],
    ["data:text/plain,caf%C3%A9", "5 B"],
    ["data:text/plain,café🙂", "9 B"],
    ["data:application/octet-stream,%00%FF%80", "3 B"],
    ["data:text/plain,bad%ZZ%20ok", "9 B"],
    ["data:text/plain,100%", "4 B"],
    ["data:text/plain,a,b=c", "5 B"],
    ["data:text/plain;base64,aGVsbG8=", "5 B"],
    ["data:text/plain;BASE64,aGVsbG8=", "5 B"],
    ["aGVsbG8=", "5 B"],
  ])("counts decoded bytes for %s", (data, size) => {
    render(
      <File
        type="file"
        status={{ type: "complete" }}
        data={data}
        mimeType="text/plain"
      />,
    );
    expect(screen.getByText(size)).toBeTruthy();
  });

  it("recognizes a data URL explicitly marked as a URL", () => {
    render(
      <File
        type="file"
        status={{ type: "complete" }}
        data="data:text/plain,hello%20world"
        mimeType="text/plain"
        sourceType="url"
      />,
    );
    expect(screen.getByText("11 B")).toBeTruthy();
  });

  it.each(["url", "id"] as const)(
    "does not guess the size of a %s",
    (sourceType) => {
      const { container } = render(
        <File
          type="file"
          status={{ type: "complete" }}
          data="https://example.com/file.txt"
          mimeType="text/plain"
          sourceType={sourceType}
        />,
      );
      expect(container.querySelector('[data-slot="file-size"]')).toBeNull();
    },
  );
});
