import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FileMessagePartProps } from "@assistant-ui/react";

import { File } from "./file";

afterEach(cleanup);

const renderFile = (data: string, sourceType?: "url" | "id") => {
  const part = {
    type: "file",
    filename: "example.txt",
    data,
    mimeType: "text/plain",
    status: { type: "complete" as const },
    ...(sourceType !== undefined && { sourceType }),
  } as FileMessagePartProps;

  render(<File {...part} />);
};

const displayedSize = () =>
  screen.getByText(/\d+(?:\.\d+)? (?:B|KB|MB)$/).textContent;

describe("File data URI sizes", () => {
  it("counts plain payload bytes", () => {
    renderFile("data:text/plain,hello");

    expect(displayedSize()).toBe("5 B");
  });

  it("decodes percent-encoded payload bytes", () => {
    renderFile("data:text/plain,hello%20world", "url");

    expect(displayedSize()).toBe("11 B");
  });

  it("keeps the base64 size calculation for base64 data URIs", () => {
    renderFile("data:text/plain;base64,aGVsbG8=", "url");

    expect(displayedSize()).toBe("5 B");
  });

  it("counts UTF-8 bytes and leaves malformed escapes non-throwing", () => {
    renderFile("data:text/plain,%C3%A9%ZZ", "url");

    expect(displayedSize()).toBe("5 B");
  });
});
