// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createPlaygroundChatToolkit } from "@/lib/playground-chat-toolkit";
import { generateCliCommands } from "./create-dialog";
import { DEFAULT_CONFIG } from "./types";

const withLoadingText = (loadingText: string) => ({
  ...DEFAULT_CONFIG,
  components: { ...DEFAULT_CONFIG.components, loadingText },
});

it("gives an install link for a config the route accepts", () => {
  const commands = generateCliCommands(withLoadingText("<thinking>"));
  expect(commands.primary.command).toContain("/playground/init?c=");
  expect(commands.alternative.command).toContain("/playground/init?c=");
});

it("gives no install link for a config the route would refuse", () => {
  const commands = generateCliCommands(withLoadingText("a".repeat(81)));
  expect(commands.primary.command).toBeUndefined();
  expect(commands.primary.description).toContain("components.loadingText");
  expect(commands.alternative.command).toBeUndefined();
  expect(commands.manual.length).toBeGreaterThan(0);
});

it("reports a refused config update to the model", async () => {
  const toolkit = createPlaygroundChatToolkit(vi.fn(() => "too long"));
  const tool = toolkit["update_config"] as unknown as {
    execute: (args: unknown) => Promise<unknown>;
  };
  await expect(
    tool.execute({ components: { loadingText: "x" } }),
  ).resolves.toEqual({ success: false, error: "too long" });
});

it("shows a refused config update as not updated", () => {
  const toolkit = createPlaygroundChatToolkit(vi.fn(() => undefined));
  const Render = (
    toolkit["update_config"] as unknown as {
      render: (props: unknown) => React.ReactElement;
    }
  ).render;
  const view = render(
    Render({
      args: { components: {} },
      status: { type: "complete" },
      result: { success: false, error: "Configuration is too long" },
    }),
  );
  expect(view.container.textContent).toBe(
    "Not updated: Configuration is too long",
  );
});
