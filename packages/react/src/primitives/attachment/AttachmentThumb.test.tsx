import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AttachmentPrimitiveThumb } from "./AttachmentThumb";

const mockUseAuiState = vi.fn();
type UseAuiStateSelector = Parameters<
  (typeof import("@assistant-ui/store"))["useAuiState"]
>[0];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

const renderThumb = (name: string, type = "file") => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ attachment: { name, type } } as never),
  );

  return renderToStaticMarkup(<AttachmentPrimitiveThumb />);
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
});
