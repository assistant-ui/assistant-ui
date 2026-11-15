import { cleanup, render } from "@testing-library/react";
import type {
  FileMessagePartProps,
  SourceMessagePartProps,
} from "@assistant-ui/react";
import { afterEach, describe, expect, it } from "vitest";

import { File } from "./file";
import { Sources } from "./sources.aui";

afterEach(cleanup);

const fileProps = (fields: Record<string, unknown>) =>
  ({
    type: "file",
    status: { type: "complete" },
    ...fields,
  }) as unknown as FileMessagePartProps;

const sourceProps = (fields: Record<string, unknown>) =>
  ({
    type: "source",
    status: { type: "complete" },
    id: "s1",
    ...fields,
  }) as unknown as SourceMessagePartProps;

describe("stock part components with fields of the wrong type", () => {
  it("renders a file part without a mime type", () => {
    const { container } = render(
      <File {...fileProps({ data: "https://example.com/report.pdf" })} />,
    );
    expect(container.querySelector(".aui-file-root")).not.toBeNull();
  });

  it("renders a file part whose mime type, data and filename are objects, with no size or download", () => {
    const { container } = render(
      <File
        {...fileProps({
          data: { nested: true },
          mimeType: { type: "image/png" },
          filename: { name: "x" },
        })}
      />,
    );
    expect(container.querySelector(".aui-file-root")).not.toBeNull();
    expect(container.querySelector('[data-slot="file-download"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\d B/);
  });

  it("infers the data kind when the source type is not url or id", () => {
    const { container } = render(
      <File
        {...fileProps({
          data: "https://example.com/report.pdf",
          mimeType: "application/pdf",
          sourceType: 42,
        })}
      />,
    );
    expect(
      container
        .querySelector('[data-slot="file-download"]')
        ?.getAttribute("href"),
    ).toBe("https://example.com/report.pdf");
  });

  it("drops a url source title that is not a string", () => {
    const { container } = render(
      <Sources
        {...sourceProps({
          sourceType: "url",
          url: "https://example.com/a",
          title: { text: "x" },
        })}
      />,
    );
    expect(container.textContent).toContain("example.com");
  });

  it("renders a document source whose title is an object", () => {
    const { container } = render(
      <Sources
        {...sourceProps({
          sourceType: "document",
          title: { text: "x" },
          mediaType: "application/pdf",
        })}
      />,
    );
    expect(container.querySelector('[data-slot="source"]')).not.toBeNull();
  });

  it("renders nothing for a url source whose url is not a string", () => {
    const { container } = render(
      <Sources {...sourceProps({ sourceType: "url", url: { href: "x" } })} />,
    );
    expect(container.textContent).toBe("");
  });
});
