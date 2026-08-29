// @vitest-environment jsdom
import { useState, type FC } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useInlineRender } from "./useInlineRender";
import type { ToolCallMessagePartProps } from "../types/MessagePartComponentTypes";

afterEach(() => cleanup());

type Props = ToolCallMessagePartProps<any, any>;

describe("useInlineRender", () => {
  it("renders replacement components with an independent hook boundary", async () => {
    let swap!: (fc: FC<Props>) => void;
    const identities = new Set<unknown>();

    const WithoutHooks = () => <div>without hooks</div>;
    const WithHooks = () => {
      const [n, setN] = useState(0);
      return <button onClick={() => setN((v) => v + 1)}>{n}</button>;
    };

    const Host = () => {
      const [toolUI, setToolUI] = useState<FC<Props>>(() => WithoutHooks);
      swap = (fc) => setToolUI(() => fc);
      const ToolUI = useInlineRender(toolUI);
      identities.add(ToolUI);
      return <ToolUI {...({} as Props)} />;
    };

    render(<Host />);
    expect(screen.getByText("without hooks")).toBeTruthy();

    await act(async () => swap(WithHooks));
    expect(screen.getByRole("button").textContent).toBe("0");

    await act(async () => screen.getByRole("button").click());
    expect(screen.getByRole("button").textContent).toBe("1");
    expect(identities.size).toBe(1);
  });
});
