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
