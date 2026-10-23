// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/xulux/analytics-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xulux/analytics-context")>()),
  useXuluxAnalytics: () => ({ sessionId: "test", pathname: "/" }),
}));

vi.mock("./useVirtualArchive", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useVirtualArchive")>()),
  useVirtualArchive: () => ({ status: "idle" }),
}));

import { XuluxCanvas } from "./XuluxCanvas";

afterEach(cleanup);

function renderPreview(previewUrl: string) {
  render(
    <XuluxCanvas
      status="ready"
      previewUrl={previewUrl}
      source="agent_template"
      error={null}
    />,
  );
}

describe("XuluxCanvas preview origin", () => {
  it.each([
    "/demos/base",
    `${window.location.origin}/demos/base`,
    "https://0d9e27d14127c0eeadfc34b424cc7ed0.preview.bl.run/preview",
    "https://8fd186ab9f30417b876d717f734067a9.preview.bl.run/preview",
  ])("renders a trusted preview from %s", (url) => {
    renderPreview(url);

    expect(screen.getByTitle("Xulux preview")).toBeTruthy();
  });

  it.each([
    "https://evil.example/preview",
    "https://0d9e27d14127c0eeadfc34b424cc7ed0.preview.bl.run.evil.example/preview",
    "https://assistant-ui-expo.vercel.app/",
    "//evil.example/preview",
    "javascript:alert(1)",
  ])("shows the empty state for an untrusted preview from %s", (url) => {
    renderPreview(url);

    expect(screen.queryByTitle("Xulux preview")).toBeNull();
    expect(screen.getByText("Waiting for preview")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open preview" })).toBeNull();
  });
});
