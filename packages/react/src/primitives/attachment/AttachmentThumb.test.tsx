import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type * as AssistantStore from "@assistant-ui/store";
import { AttachmentPrimitiveThumb } from "./AttachmentThumb";

const mockUseAuiState = vi.fn();
type UseAuiStateSelector = Parameters<
  (typeof AssistantStore)["useAuiState"]
>[0];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof AssistantStore>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

const renderThumb = (
  name: string,
  type = "file",
  props?: AttachmentPrimitiveThumb.Props,
) => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ attachment: { name, type } } as never),
  );

  return renderToStaticMarkup(<AttachmentPrimitiveThumb {...props} />);
};

describe("AttachmentPrimitiveThumb", () => {
  it("renders the dotted extension for a single-extension name", () => {
    expect(renderThumb("photo.png")).toBe("<div>.png</div>");
  });

  it("takes only the last segment for a multi-extension name", () => {
    expect(renderThumb("archive.tar.gz")).toBe("<div>.gz</div>");
  });

  it("falls back to the attachment type when the name has no extension", () => {
    expect(renderThumb("noext", "document")).toBe("<div>document</div>");
  });

  it("falls back to the attachment type for an empty name", () => {
    expect(renderThumb("", "image")).toBe("<div>image</div>");
  });

  it("treats a leading-dot name as extensionless", () => {
    expect(renderThumb(".gitignore")).toBe("<div>file</div>");
  });

  it("falls back to the attachment type for a trailing-dot name", () => {
    expect(renderThumb("report.", "image")).toBe("<div>image</div>");
  });

  it("renders custom children instead of the label", () => {
    expect(renderThumb("report.pdf", "file", { children: <em>PDF</em> })).toBe(
      "<div><em>PDF</em></div>",
    );
  });

  it("renders the child element when asChild is set", () => {
    expect(
      renderThumb("report.pdf", "file", {
        asChild: true,
        children: <span>custom</span>,
      }),
    ).toBe("<span>custom</span>");
  });
});
