// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PreviewCodeClient } from "./preview-code";
import { SampleFrame } from "./samples/sample-frame";
import { setFlavor } from "./contexts/flavor";

const highlighter = vi.hoisted(() => {
  let finish!: () => void;
  const download = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { load: vi.fn(), render: vi.fn(), finish, download };
});
vi.mock("react-shiki", async (importOriginal) => {
  highlighter.load();
  await highlighter.download;
  const actual = await importOriginal<typeof import("react-shiki")>();
  return {
    ...actual,
    default: (props: import("react-shiki").ShikiHighlighterProps) => {
      highlighter.render(props);
      return <actual.default {...props} />;
    },
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("loads highlighting only when a code panel opens while keeping source and copy available", async () => {
  const writeText = vi.fn(async (_text: string) => {});
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  act(() => setFlavor("base"));
  const { container } = render(
    <>
      <PreviewCodeClient
        code="const radix = 1;"
        baseCode="const base = 2;"
        codeVariant="radix"
      >
        <span>Live preview</span>
      </PreviewCodeClient>
      <SampleFrame code="const sample = 3;">
        <span>Live sample</span>
      </SampleFrame>
    </>,
  );
  try {
    expect(highlighter.load).not.toHaveBeenCalled();
    expect(screen.queryByText("const base = 2;")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(screen.getByText("const base = 2;")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith("const base = 2;"),
    );
    act(() => setFlavor("radix"));
    expect(screen.getByText("const radix = 1;")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith("const radix = 1;"),
    );
    fireEvent.click(screen.getByRole("button", { name: "View Code" }));
    expect(screen.getByText("Live sample")).toBeTruthy();
    expect(screen.getByText("const sample = 3;")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith("const sample = 3;"),
    );
    await act(async () => {
      highlighter.finish();
      await vi.dynamicImportSettled();
    });
    await waitFor(() =>
      expect(container.querySelector("pre span")).not.toBeNull(),
    );
    expect(highlighter.load).toHaveBeenCalledOnce();
    expect(highlighter.render).toHaveBeenCalledWith(
      expect.objectContaining({
        children: "const radix = 1;",
        language: "tsx",
        theme: { dark: "catppuccin-mocha", light: "catppuccin-latte" },
      }),
    );
    expect(highlighter.render).toHaveBeenCalledWith(
      expect.objectContaining({
        children: "const sample = 3;",
        theme: { dark: "vitesse-dark", light: "vitesse-dark" },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide Code" }));
    expect(screen.getByText("Live preview")).toBeTruthy();
    expect(container.querySelector("pre")).toBeNull();
  } finally {
    await act(async () => {
      highlighter.finish();
      await vi.dynamicImportSettled();
    });
  }
});
