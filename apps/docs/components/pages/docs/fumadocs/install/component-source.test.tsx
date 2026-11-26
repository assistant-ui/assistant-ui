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
import { ComponentSourceFromFile } from "./component-source";

const highlighter = vi.hoisted(() => {
  let finish!: () => void;
  const download = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { finish, download };
});
vi.mock("react-shiki", async (importOriginal) => {
  await highlighter.download;
  return importOriginal();
});
afterEach(() => {
  cleanup();
});

it("copies the file's source from the rendered code, before and after highlighting", async () => {
  const writeText = vi.fn(async (_text: string) => {});
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const source =
    'import { x } from "y";\n\nexport function Thread() {\n  return x;\n}\n';
  const { container } = render(
    <ComponentSourceFromFile
      file={{
        name: "thread",
        path: "components/assistant-ui/thread.tsx",
        content: source.replace("export function", "export default function"),
      }}
    />,
  );
  try {
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(source));

    await act(async () => {
      highlighter.finish();
      await vi.dynamicImportSettled();
    });
    await waitFor(() =>
      expect(container.querySelector("pre span")).not.toBeNull(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1]![0].replace(/\n+$/, "")).toBe(
      source.replace(/\n+$/, ""),
    );
  } finally {
    await act(async () => {
      highlighter.finish();
      await vi.dynamicImportSettled();
    });
  }
});
