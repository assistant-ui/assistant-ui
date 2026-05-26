import { describe, it, expect } from "vitest";
import { buildReactArtifactHtml } from "./buildReactArtifactHtml";

describe("buildReactArtifactHtml — origin recovery", () => {
  const html = buildReactArtifactHtml("export default () => null");

  it("resolves the host origin from the ?origin= query string", () => {
    expect(html).toContain(
      'new URLSearchParams(location.search).get("origin")',
    );
  });

  it("falls back to location.ancestorOrigins[0] (survives blob: navigation)", () => {
    expect(html).toContain("location.ancestorOrigins");
  });

  it("never targets postMessage at '*'", () => {
    expect(html).toContain("window.parent.postMessage");
    expect(html).not.toContain(
      'postMessage(\n              { type: "aui:artifact:status", ...payload },\n              "*"',
    );
    expect(html).not.toMatch(/postMessage\([^)]*["']\*["']\s*\)/);
  });

  it("still emits the import map and the user source block", () => {
    expect(html).toContain('<script type="importmap">');
    expect(html).toContain('id="aui-react-source"');
  });
});

describe("buildReactArtifactHtml — handshake", () => {
  const html = buildReactArtifactHtml("export default () => null");
  it("registers a listener for the host origin handshake", () => {
    expect(html).toContain("aui:artifact:hello");
    expect(html).toContain('addEventListener("message"');
  });
  it("buffers status until the origin is known", () => {
    expect(html).toContain("bufferedStatusPayload");
  });
});

describe("buildReactArtifactHtml — render-error reporting", () => {
  const html = buildReactArtifactHtml("export default () => null");

  it("wraps the component in an error boundary that reports failures", () => {
    expect(html).toContain("getDerivedStateFromError");
    expect(html).toContain("componentDidCatch");
    // The boundary funnels caught errors through showError (-> ok:false).
    expect(html).toContain(
      "componentDidCatch(error) {\n            showError(error);",
    );
  });

  it("reports success from a mount effect, not an unconditional rAF", () => {
    // Success is gated on a clean render via SuccessProbe's effect.
    expect(html).toContain("function SuccessProbe()");
    expect(html).toContain("reportStatus({ ok: true })");
    // The old unconditional rAF-after-render success report is gone.
    expect(html).not.toContain(
      "requestAnimationFrame(() => reportStatus({ ok: true }))",
    );
  });

  it("mounts the component and the success probe under the boundary", () => {
    expect(html).toContain("ArtifactErrorBoundary");
    expect(html).toContain("React.createElement(SuccessProbe)");
  });
});
