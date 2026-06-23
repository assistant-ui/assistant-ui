import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComposerAttachments } from "./ComposerAttachments";

describe("ComposerAttachments", () => {
  it("renders attachments with name, kind, and upload status", () => {
    const html = renderToStaticMarkup(
      <ComposerAttachments
        attachments={[
          {
            id: "a1",
            name: "photo.png",
            kind: "image",
            status: { type: "running", reason: "uploading", progress: 0.5 },
          },
          {
            id: "a2",
            name: "doc.pdf",
            kind: "file",
            status: { type: "complete" },
          },
        ]}
      />,
    );
    expect(html).toContain("Composer attachments (2)");
    expect(html).toContain("photo.png");
    expect(html).toContain("uploading 50%");
    expect(html).toContain("complete");
  });

  it("renders nothing when there are no attachments", () => {
    expect(renderToStaticMarkup(<ComposerAttachments attachments={[]} />)).toBe(
      "",
    );
  });
});
