import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Image, ImagePreview } from "./image";

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

vi.mock("./surfaces", () => ({
  paper: "paper",
  usePulse: () => 1,
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const icon = (name: string) => (props: any) =>
    React.createElement("svg", { "data-testid": name, ...props });
  return {
    ImageIcon: icon("ImageIcon"),
    ImageOffIcon: icon("ImageOffIcon"),
    ShieldAlertIcon: icon("ShieldAlertIcon"),
    XIcon: icon("XIcon"),
  };
});

vi.mock("react-native", async () => {
  const React = await import("react");
  const View = ({
    accessibilityLabel,
    accessibilityRole,
    children,
    className,
    ...props
  }: any) =>
    React.createElement(
      "div",
      {
        ...props,
        className,
        "aria-label": accessibilityLabel,
        role: accessibilityRole,
      },
      children,
    );
  const Text = ({ children, className, ...props }: any) =>
    React.createElement("span", { ...props, className }, children);
  const Pressable = ({
    accessibilityLabel,
    accessibilityRole,
    children,
    className,
    onPress,
    ...props
  }: any) =>
    React.createElement(
      "button",
      {
        ...props,
        className,
        "aria-label": accessibilityLabel,
        role: accessibilityRole,
        onClick: onPress,
      },
      children,
    );
  const NativeImage = ({
    accessibilityLabel,
    className,
    onError,
    onLoad,
    resizeMode: _resizeMode,
    source,
    ...props
  }: any) =>
    React.createElement("img", {
      ...props,
      alt: accessibilityLabel,
      className,
      src: source?.uri,
      onError: () => onError?.({ nativeEvent: {} }),
      onLoad: () =>
        onLoad?.({ nativeEvent: { source: { width: 640, height: 320 } } }),
    });
  const Modal = ({ children, visible }: any) =>
    visible ? React.createElement("div", { role: "dialog" }, children) : null;
  return {
    ActivityIndicator: (props: any) => React.createElement("div", props),
    Animated: { View },
    Image: NativeImage,
    Modal,
    Pressable,
    Text,
    View,
  };
});

vi.mock("react-native-safe-area-context", async () => {
  const React = await import("react");
  return {
    SafeAreaView: ({ children }: any) =>
      React.createElement("div", null, children),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("Image", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it("shows a placeholder until its image loads, then uses the loaded aspect ratio", async () => {
    await act(async () => {
      root.render(
        <Image
          type="image"
          status={{ type: "complete" }}
          image="https://example.com/image.png"
        />,
      );
    });

    expect(container.querySelector('[data-testid="ImageIcon"]')).not.toBeNull();

    const preview = container.querySelector("img") as HTMLImageElement;
    await act(async () => {
      preview.dispatchEvent(new Event("load", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="ImageIcon"]')).toBeNull();
    expect(preview.style.aspectRatio).toBe("2 / 1");
  });

  it("replaces a failed preview with an error state", async () => {
    await act(async () => {
      root.render(<ImagePreview src="https://example.com/image.png" />);
    });

    await act(async () => {
      (container.querySelector("img") as HTMLImageElement).dispatchEvent(
        new Event("error", { bubbles: true }),
      );
    });

    expect(container.querySelector("img")).toBeNull();
    expect(
      container.querySelector('[data-testid="ImageOffIcon"]'),
    ).not.toBeNull();
  });

  it("renders generation and content filter states", async () => {
    await act(async () => {
      root.render(
        <Image
          type="image"
          status={{ type: "running" }}
          filename="draft.png"
          image="https://example.com/image.png"
        />,
      );
    });

    expect(
      container.querySelector('[aria-label="Generating image"]'),
    ).not.toBeNull();

    await act(async () => {
      root.render(
        <Image
          type="image"
          status={{ type: "incomplete", reason: "content-filter" }}
          image="https://example.com/image.png"
        />,
      );
    });

    expect(container.textContent).toContain("Image could not be generated");
    expect(container.textContent).toContain("The provider blocked this image.");
  });

  it("opens the zoom modal and closes it from its close button", async () => {
    await act(async () => {
      root.render(
        <Image
          type="image"
          status={{ type: "complete" }}
          image="https://example.com/image.png"
        />,
      );
    });

    await act(async () => {
      click(container.querySelector('[aria-label="Zoom image"]') as Element);
    });

    expect(
      container.querySelector('[aria-label="Close zoomed image"]'),
    ).not.toBeNull();

    await act(async () => {
      click(
        container.querySelector('[aria-label="Close zoomed image"]') as Element,
      );
    });

    expect(
      container.querySelector('[aria-label="Close zoomed image"]'),
    ).toBeNull();
  });
});
