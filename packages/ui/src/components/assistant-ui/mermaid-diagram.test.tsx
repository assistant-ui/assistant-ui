import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MermaidZoom } from "./mermaid-diagram";

afterEach(cleanup);

const SVG = '<svg id="graph"><rect fill="url(#grad)" /></svg>';

const renderZoom = () =>
  render(
    <MermaidZoom svg={SVG}>
      <div data-testid="inline-diagram" />
    </MermaidZoom>,
  );

const trigger = () => screen.getByLabelText("Expand diagram");

const openZoom = () => {
  fireEvent.click(trigger());
  return screen.findByRole("dialog");
};

const zoomContent = (dialog: HTMLElement) =>
  dialog.querySelector<HTMLElement>('[data-slot="mermaid-zoom-content"]')!;

describe("MermaidZoom", () => {
  it("opens a titled dialog rendering the id-rewritten copy of the diagram", async () => {
    renderZoom();
    const dialog = await openZoom();

    expect(trigger().getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(trigger().getAttribute("aria-controls")).toBe(dialog.id);
    expect(dialog.textContent).toContain("Diagram");
    expect(zoomContent(dialog).innerHTML).toContain('id="graph-zoom"');
    expect(zoomContent(dialog).innerHTML).toContain("url(#grad-zoom)");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    renderZoom();
    await openZoom();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger()));
  });

  it("resets the pan and zoom transform when reopened", async () => {
    renderZoom();
    const dialog = await openZoom();

    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(zoomContent(dialog).style.transform).not.toContain("scale(1)");

    fireEvent.click(screen.getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const reopened = await openZoom();
    expect(zoomContent(reopened).style.transform).toBe(
      "translate(0px, 0px) scale(1)",
    );
  });
});
