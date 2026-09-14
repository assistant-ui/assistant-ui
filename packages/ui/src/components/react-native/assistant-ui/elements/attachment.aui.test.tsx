import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerAddAttachment, ComposerAttachments } from "./attachment.aui";

const h = vi.hoisted(() => {
  const state: any = {
    composer: { attachments: [] },
    attachment: undefined,
  };
  state.optional = { thread: state.thread };
  const addAttachment = vi.fn();
  const removeAttachment = vi.fn();
  const launchImageLibraryAsync = vi.fn();
  const setClipboardString = vi.fn();
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
    removeAttachment,
    launchImageLibraryAsync,
    setClipboardString,
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

describe("attachments", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.composer.attachments = [];
    h.addAttachment.mockReset();
    h.removeAttachment.mockReset();
    h.launchImageLibraryAsync.mockReset();
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

  it("adds one JPEG attachment for each selected image", async () => {
    h.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { fileName: "first.png", base64: "first-data" },
        { fileName: null, base64: "second-data" },
      ],
    });

    await render();

    await act(async () => {
      click(labeled("Add image"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(h.addAttachment).toHaveBeenCalledTimes(2);
    expect(h.addAttachment).toHaveBeenNthCalledWith(1, {
      name: "first.png",
      contentType: "image/jpeg",
      type: "image",
      content: [{ type: "image", image: "data:image/jpeg;base64,first-data" }],
    });
    expect(h.addAttachment).toHaveBeenNthCalledWith(2, {
      name: "image.jpg",
      contentType: "image/jpeg",
      type: "image",
      content: [{ type: "image", image: "data:image/jpeg;base64,second-data" }],
    });
  });

  it("adds nothing when the image picker is canceled", async () => {
    h.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });

    await render();

    await act(async () => {
      click(labeled("Add image"));
      await Promise.resolve();
    });

    expect(h.addAttachment).not.toHaveBeenCalled();
  });
});
