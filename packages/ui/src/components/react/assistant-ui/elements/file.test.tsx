import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { File } from "./file";

afterEach(cleanup);

describe("File inline size", () => {
  it.each([
    ["data:text/plain,hello%20world", "11 B"],
    ["data:text/plain,hello%20world#section", "11 B"],
    ["data:text/plain,hello%23world#section", "11 B"],
    ["data:text/plain,hello", "5 B"],
    ["data:,", "0 B"],
    ["data:text/plain,caf%C3%A9", "5 B"],
    ["data:text/plain,café🙂", "9 B"],
    ["data:application/octet-stream,%00%FF%80", "3 B"],
    ["data:text/plain,bad%ZZ%20ok", "9 B"],
    ["data:text/plain,100%", "4 B"],
    ["data:text/plain,a,b=c", "5 B"],
    ["data:text/plain;base64,aGVsbG8=", "5 B"],
    ["data:text/plain;base64,aGVsbG8%3D", "5 B"],
    ["data:text/plain;base64,aGVsbG8%3D#section", "5 B"],
    ["data:text/plain;base64,aGVs%20bG8%3D", "5 B"],
    ["data:text/plain;base64,%59%51%3d%3d", "1 B"],
    ["data:text/plain;base64,aGVs\tbG8=\n", "5 B"],
    ["data:text/plain;base64,", "0 B"],
    ["data:text/plain;base64,YQ", "1 B"],
    ["data:text/plain;base64,YWI", "2 B"],
    ["data:text/plain;base64,YWJj", "3 B"],
    ["data:application/octet-stream;base64,+/8=", "2 B"],
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

  it.each([
    "data:text/plain",
    "data:text/plain#section,hello",
    "data:text/plain;base64,aGVsbG8%2C=",
    "data:text/plain;base64,aGVsbG8,=",
    "data:text/plain;base64,=",
    "data:text/plain;base64,==",
    "data:text/plain;base64,Y===",
    "data:text/plain;base64,YQ=",
    "data:text/plain;base64,YQ===",
    "data:text/plain;base64,Y",
    "data:text/plain;base64,Y=Q=",
    "data:text/plain;base64,YQ%ZZ",
    "data:text/plain;base64,YQ\u2028",
    "data:application/octet-stream;base64,-_8=",
  ])("uses a zero-byte fallback for malformed data URL %s", (data) => {
    render(
      <File
        type="file"
        status={{ type: "complete" }}
        data={data}
        mimeType="text/plain"
      />,
    );
    expect(screen.getByText("0 B")).toBeTruthy();
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
