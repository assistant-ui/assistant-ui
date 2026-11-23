import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MessageAttachments } from "./message-attachment";

afterEach(cleanup);

const thumb = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("span.bg-cover")!;

describe("MessageAttachments", () => {
  it("renders a local swatch", () => {
    const { container } = render(
      <MessageAttachments
        attachments={[
          {
            id: "1",
            name: "diagram.png",
            size: "1 MB",
            kind: "image",
            swatch: "url(/diagram-thumb.png)",
          },
        ]}
      />,
    );

    expect(thumb(container).style.backgroundImage).toContain(
      "diagram-thumb.png",
    );
  });

  it("drops a swatch that loads from an unlisted origin", () => {
    const { container } = render(
      <MessageAttachments
        attachments={[
          {
            id: "1",
            name: "diagram.png",
            size: "1 MB",
            kind: "image",
            swatch: "url(https://images.example/t.png)",
          },
        ]}
      />,
    );

    expect(thumb(container).style.backgroundImage).toBe("");
  });

  it("keeps a swatch from a listed origin", () => {
    const { container } = render(
      <MessageAttachments
        imageOrigins={["https://images.example"]}
        attachments={[
          {
            id: "1",
            name: "diagram.png",
            size: "1 MB",
            kind: "image",
            swatch: "url(https://images.example/t.png)",
          },
        ]}
      />,
    );

    expect(thumb(container).style.backgroundImage).toContain("images.example");
  });
});
