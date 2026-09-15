import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerAddAttachment, ComposerAttachments } from "./attachment.aui";

const h = vi.hoisted(() => {
  const state: any = {
    composer: { attachments: [], isEditing: true },
    attachment: undefined,
  };
  state.optional = { thread: state.thread };
  const addAttachment = vi.fn();
  const removeAttachment = vi.fn();
  const launchImageLibraryAsync = vi.fn();
  const resize = vi.fn();
  const saveAsync = vi.fn();
  const release = vi.fn();
  const renderAsync = vi.fn();
  const manipulate = vi.fn((uri: string) => {
    const context = {
      resize: (size: unknown) => {
        resize(uri, size);
        return context;
      },
      renderAsync: async () => {
        await renderAsync(uri);
        return {
          saveAsync: (options: unknown) => saveAsync(uri, options),
          release: () => release("image", uri),
        };
      },
      release: () => release("context", uri),
    };
    return context;
  });
  const setClipboardString = vi.fn();
  const addAttachmentProps: any[] = [];
  const removeAttachmentProps: any[] = [];
  const composer = {
    getState: () => state.composer,
    addAttachment,
    attachment: ({ index }: { index: number }) => ({
      getState: () => state.composer.attachments[index],
      remove: removeAttachment,
    }),
  };
  const client: any = {
    getState: () => state,
    composer,
    attachment: { getState: () => state.attachment, remove: removeAttachment },
  };

  return {
    state,
    client,
    addAttachment,
    addAttachmentProps,
    removeAttachment,
    removeAttachmentProps,
    launchImageLibraryAsync,
    manipulate,
    release,
    renderAsync,
    resize,
    saveAsync,
    setClipboardString,
  };
});

vi.mock("@assistant-ui/react-native", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/react-native")>();
  const React = await import("react");

  const AddAttachment = (props: any) => {
    h.addAttachmentProps.push(props);
    return React.createElement(actual.ComposerPrimitive.AddAttachment, props);
  };
  const Remove = (props: any) => {
    h.removeAttachmentProps.push(props);
    return React.createElement(actual.AttachmentPrimitive.Remove, props);
  };

  return {
    ...actual,
    ComposerPrimitive: { ...actual.ComposerPrimitive, AddAttachment },
    AttachmentPrimitive: { ...actual.AttachmentPrimitive, Remove },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  const React = await import("react");
  const ClientContext = React.createContext<any>(h.client);
  const useAui = () => React.useContext(ClientContext);
  const useAuiState = <T,>(selector: (state: any) => T) =>
    selector(useAui().getState());

  return {
    ...actual,
    AuiConfig: (config: any) => config,
    Derived: (config: any) => config,
    AuiProvider: ({ children, config }: any) => {
      const parent = useAui();
      const scopes = Object.fromEntries(
        Object.entries(config ?? {}).map(([name, derived]: [string, any]) => [
          name,
          derived.get(parent),
        ]),
      );
      const scopedState = {
        ...parent.getState(),
        ...Object.fromEntries(
          Object.entries(scopes).map(([name, scope]: [string, any]) => [
            name,
            scope.getState(),
          ]),
        ),
      };
      const client = { ...parent, ...scopes, getState: () => scopedState };
      return React.createElement(
        ClientContext.Provider,
        { value: client },
        children,
      );
    },
    AuiIf: ({ children, condition }: any) =>
      useAuiState(condition)
        ? React.createElement(React.Fragment, null, children)
        : null,
    RenderChildrenWithAccessor: ({ children, getItemState }: any) => {
      const aui = useAui();
      return children(() => getItemState(aui));
    },
    useAui,
    useAuiState,
    useAuiEvent: () => {},
  };
});

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: () => undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  const icon =
    (name: string) =>
    ({ accessibilityLabel }: { accessibilityLabel?: string }) =>
      React.createElement(View, {
        testID: accessibilityLabel ?? name,
      });

  return { PlusIcon: icon("PlusIcon"), XIcon: icon("XIcon") };
});

vi.mock("expo-clipboard", () => ({ setStringAsync: h.setClipboardString }));
vi.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: h.manipulate },
  SaveFormat: { JPEG: "jpeg" },
}));
vi.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: h.launchImageLibraryAsync,
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("attachments", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.composer.attachments = [];
    h.state.composer.isEditing = true;
    h.addAttachmentProps.length = 0;
    h.addAttachment.mockReset();
    h.removeAttachment.mockReset();
    h.removeAttachmentProps.length = 0;
    h.launchImageLibraryAsync.mockReset();
    h.release.mockReset();
    h.renderAsync.mockReset();
    h.resize.mockReset();
    h.saveAsync.mockReset();
    h.setClipboardString.mockReset();

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

  const render = async () => {
    await act(async () => {
      root.render(
        <>
          <ComposerAttachments />
          <ComposerAddAttachment />
        </>,
      );
    });
  };

  const labeled = (label: string) => {
    const element = container.querySelector(`[aria-label="${label}"]`);
    expect(element).not.toBeNull();
    return element as HTMLElement;
  };

  it("renders an image thumbnail and a name chip for non-image attachments", async () => {
    h.state.composer.attachments = [
      {
        id: "image-1",
        type: "image",
        name: "photo.jpg",
        content: [{ type: "image", image: "https://example.com/photo.jpg" }],
      },
      { id: "file-1", type: "file", name: "notes.pdf", content: [] },
    ];

    await render();

    expect(
      container.querySelector('img[src="https://example.com/photo.jpg"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("notes.pdf");
  });

  it("removes an attachment when Remove is pressed", async () => {
    h.state.composer.attachments = [
      { id: "file-1", type: "file", name: "notes.pdf", content: [] },
    ];

    await render();

    await act(async () => {
      click(labeled("Remove attachment"));
    });

    expect(h.removeAttachment).toHaveBeenCalledTimes(1);
  });

  it("uses bounded hit slop for the attachment controls", async () => {
    h.state.composer.attachments = [
      { id: "file-1", type: "file", name: "notes.pdf", content: [] },
    ];

    await render();

    expect(h.addAttachmentProps).toHaveLength(1);
    expect(h.addAttachmentProps[0].hitSlop).toBe(10);
    expect(h.removeAttachmentProps).toHaveLength(1);
    expect(h.removeAttachmentProps[0].hitSlop).toEqual({
      top: 14,
      right: 14,
    });
  });

  it("re-encodes each selected image as a bounded JPEG attachment", async () => {
    h.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///first",
          fileName: "first.HEIC",
          width: 4000,
          height: 3000,
        },
        { uri: "file:///second", fileName: null, width: 600, height: 900 },
        {
          uri: "file:///third",
          fileName: "third.png",
          width: 100,
          height: 100,
        },
        {
          uri: "file:///fourth",
          fileName: "fourth.jpg",
          width: 100,
          height: 100,
        },
        {
          uri: "file:///fifth",
          fileName: "fifth.jpg",
          width: 100,
          height: 100,
        },
      ],
    });
    h.renderAsync.mockImplementation(async (uri: string) => {
      if (uri === "file:///fifth") throw new Error("render failed");
    });
    h.saveAsync.mockImplementation(async (uri: string) => {
      if (uri === "file:///third") return {};
      if (uri === "file:///fourth") throw new Error("decode failed");
      return { base64: `${uri}-data` };
    });

    await render();

    await act(async () => {
      click(labeled("Add image"));
      await flush();
    });

    expect(h.resize).toHaveBeenCalledTimes(1);
    expect(h.resize).toHaveBeenCalledWith("file:///first", { width: 2048 });
    expect(h.saveAsync).toHaveBeenCalledTimes(4);
    expect(h.saveAsync).toHaveBeenCalledWith("file:///second", {
      format: "jpeg",
      compress: 0.8,
      base64: true,
    });
    expect(h.release.mock.calls).toEqual([
      ["image", "file:///first"],
      ["context", "file:///first"],
      ["image", "file:///second"],
      ["context", "file:///second"],
      ["image", "file:///third"],
      ["context", "file:///third"],
      ["image", "file:///fourth"],
      ["context", "file:///fourth"],
      ["context", "file:///fifth"],
    ]);
    expect(h.addAttachment).toHaveBeenCalledTimes(2);
    expect(h.addAttachment).toHaveBeenNthCalledWith(1, {
      name: "first.jpg",
      contentType: "image/jpeg",
      type: "image",
      content: [
        { type: "image", image: "data:image/jpeg;base64,file:///first-data" },
      ],
    });
    expect(h.addAttachment).toHaveBeenNthCalledWith(2, {
      name: "image.jpg",
      contentType: "image/jpeg",
      type: "image",
      content: [
        { type: "image", image: "data:image/jpeg;base64,file:///second-data" },
      ],
    });
  });

  it("adds nothing when the image picker rejects", async () => {
    h.launchImageLibraryAsync.mockRejectedValue(new Error("picker busy"));

    await render();

    await act(async () => {
      click(labeled("Add image"));
      await flush();
    });

    expect(h.addAttachment).not.toHaveBeenCalled();
  });

  it("adds nothing when the image picker is canceled", async () => {
    h.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });

    await render();

    await act(async () => {
      click(labeled("Add image"));
      await flush();
    });

    expect(h.addAttachment).not.toHaveBeenCalled();
  });

  it("keeps the picker closed while the composer cannot accept attachments", async () => {
    h.state.composer.isEditing = false;

    await render();

    const button = labeled("Add image");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await act(async () => {
      click(button);
      await flush();
    });

    expect(h.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});
