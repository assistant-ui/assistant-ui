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

const renderThumb = (name: string, props?: AttachmentPrimitiveThumb.Props) => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ attachment: { name } } as never),
  );

  return renderToStaticMarkup(<AttachmentPrimitiveThumb {...props} />);
};

describe("AttachmentPrimitiveThumb", () => {
  it("renders the file extension by default", () => {
    const html = renderThumb("report.pdf");

    expect(html).toBe("<div>.pdf</div>");
  });

  it("renders only the last segment for multi-dot names", () => {
    const html = renderThumb("archive.tar.gz");

    expect(html).toBe("<div>.gz</div>");
  });

  it("renders an empty extension for names without a dot", () => {
    const html = renderThumb("README");

    expect(html).toBe("<div>.</div>");
  });

  it("renders custom children instead of the extension", () => {
    const html = renderThumb("report.pdf", { children: <em>PDF</em> });

    expect(html).toBe("<div><em>PDF</em></div>");
  });

  it("renders the child element when asChild is set", () => {
    const html = renderThumb("report.pdf", {
      asChild: true,
      children: <span>custom</span>,
    });

    expect(html).toBe("<span>custom</span>");
  });
});
