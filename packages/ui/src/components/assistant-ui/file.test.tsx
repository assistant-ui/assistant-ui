import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import {
  BracesIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
} from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { FileIconDisplay, getMimeTypeIcon } from "./file";

afterEach(cleanup);

const iconClass = (mimeType?: string) => {
  const { container } = render(<FileIconDisplay mimeType={mimeType} />);
  return (
    container
      .querySelector("[data-slot='file-icon'] svg")
      ?.getAttribute("class") ?? ""
  );
};

describe("FileIconDisplay", () => {
  it("does not use a render-time component type as JSX", () => {
    const source = readFileSync(
      resolve("src/components/assistant-ui/file.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(
      /const\s+\w+\s*=\s*(?:mimeType\s*\?\s*)?getMimeTypeIcon\(/,
    );
    expect(source).toMatch(/<ImageIcon\b/);
  });

  it.each([
    ["image/png", "lucide-image"],
    ["IMAGE/JPEG", "lucide-image"],
    ["application/pdf", "lucide-file-text"],
    ["application/json", "lucide-braces"],
    ["text/plain", "lucide-file-text"],
    ["audio/mpeg", "lucide-music"],
    ["video/mp4", "lucide-video"],
    ["application/octet-stream", "lucide-file"],
    [undefined, "lucide-file"],
  ] as const)("renders the %s icon", (mimeType, lucideClass) => {
    expect(iconClass(mimeType)).toContain(lucideClass);
  });

  it("lets children replace the MIME icon", () => {
    const { container } = render(
      <FileIconDisplay mimeType="image/png">
        <span data-testid="custom-icon">custom</span>
      </FileIconDisplay>,
    );

    expect(screen.getByTestId("custom-icon")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("getMimeTypeIcon", () => {
  it.each([
    ["image/png", ImageIcon],
    ["IMAGE/JPEG", ImageIcon],
    ["application/pdf", FileTextIcon],
    ["application/json", BracesIcon],
    ["text/plain", FileTextIcon],
    ["audio/mpeg", MusicIcon],
    ["video/mp4", VideoIcon],
    ["application/octet-stream", FileIcon],
  ] as const)("maps %s", (mimeType, icon) => {
    expect(getMimeTypeIcon(mimeType)).toBe(icon);
  });
});
