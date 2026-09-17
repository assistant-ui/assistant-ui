import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { File, FileIconDisplay, FileOpen } from "./file";

const h = vi.hoisted(() => ({ openURL: vi.fn(() => Promise.resolve()) }));

vi.mock("@/components/ui/icon", async () => {
  const React = await import("react");
  return {
    Icon: ({ as: Component, ...props }: any) =>
      React.createElement(Component, props),
  };
});

vi.mock("./icon-button", async () => {
  const React = await import("react");
  return {
    IconButton: ({ children, label, onPress }: any) =>
      React.createElement(
        "button",
        { "aria-label": label, onClick: onPress },
        children,
      ),
  };
});

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const icon = (name: string) => (props: any) =>
    React.createElement("svg", { "data-testid": name, ...props });
  return {
    BracesIcon: icon("BracesIcon"),
    ExternalLinkIcon: icon("ExternalLinkIcon"),
    FileIcon: icon("FileIcon"),
    FileTextIcon: icon("FileTextIcon"),
    ImageIcon: icon("ImageIcon"),
    MusicIcon: icon("MusicIcon"),
    VideoIcon: icon("VideoIcon"),
  };
});

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const View = ({ children, className, ...props }: any) =>
    React.createElement("div", { ...props, className }, children);
  const Text = ({ children, className, ...props }: any) =>
    React.createElement("span", { ...props, className }, children);
  return { ...actual, Linking: { openURL: h.openURL }, Text, View };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("File", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.openURL.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("chooses an icon from the file mime type", async () => {
    await act(async () => {
      root.render(<FileIconDisplay mimeType="image/png" />);
    });

    expect(container.querySelector('[data-testid="ImageIcon"]')).not.toBeNull();
  });

  it("shows payload sizes for base64 and data URI files but not URLs", async () => {
    await act(async () => {
      root.render(
        <File
          type="file"
          status={{ type: "complete" }}
          filename="hello.txt"
          mimeType="text/plain"
          data="aGVsbG8="
        />,
      );
    });

    expect(container.textContent).toContain("5 B");

    await act(async () => {
      root.render(
        <File
          type="file"
          status={{ type: "complete" }}
          filename="hello.txt"
          mimeType="text/plain"
          data="data:text/plain;base64,aGVsbG8="
          sourceType="url"
        />,
      );
    });

    expect(container.textContent).toContain("5 B");

    await act(async () => {
      root.render(
        <File
          type="file"
          status={{ type: "complete" }}
          filename="hello.txt"
          mimeType="text/plain"
          data="https://example.com/hello.txt"
        />,
      );
    });

    expect(container.textContent).not.toContain("5 B");
  });

  it.each(["====", "Y===", "YQ=", "YQ===", "Y", "Y=Q=", "-_8=", "YQ,AA=="])(
    "uses a zero-byte fallback for malformed raw base64 %s",
    async (data) => {
      await act(async () => {
        root.render(
          <File
            type="file"
            status={{ type: "complete" }}
            filename="broken.txt"
            mimeType="text/plain"
            data={data}
          />,
        );
      });

      expect(container.textContent).toContain("0 B");
      expect(container.textContent).not.toContain("-1 B");
    },
  );

  it("opens only http(s) URLs", async () => {
    await act(async () => {
      root.render(
        <FileOpen
          data="https://example.com/report.pdf"
          filename="report.pdf"
        />,
      );
    });

    await act(async () => {
      click(
        container.querySelector('[aria-label="Open report.pdf"]') as Element,
      );
    });

    expect(h.openURL).toHaveBeenCalledWith("https://example.com/report.pdf");

    await act(async () => {
      root.render(<FileOpen data="ftp://example.com/report.pdf" />);
    });
    expect(container.querySelector("button")).toBeNull();

    await act(async () => {
      root.render(<FileOpen data="aGVsbG8=" />);
    });
    expect(container.querySelector("button")).toBeNull();

    await act(async () => {
      root.render(<FileOpen data="file-id" sourceType="id" />);
    });
    expect(container.querySelector("button")).toBeNull();
  });
});
