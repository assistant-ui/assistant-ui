// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

type Tab = { id: string; docs: string; html: string };

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal()),
  cacheLife: vi.fn(),
}));
vi.mock("@/lib/github", () => ({ getRepo: async () => null }));
vi.mock("@/lib/npm", () => ({ getWeeklyDownloads: async () => null }));
vi.mock("@/lib/element-source", () => ({
  highlightElementSource: async (code: string) =>
    code
      .split("\n")
      .map((line) => `<span class="line">${line}</span>`)
      .join("\n"),
}));
vi.mock("@/components/pages/home/hero", () => ({ Hero: () => null }));
vi.mock("@/components/pages/home/demo", () => ({ HomeDemo: () => null }));
vi.mock("@/components/pages/home/library-body", () => ({
  LibraryBody: ({
    setupTabs,
    reactVersion,
  }: {
    setupTabs: Tab[];
    reactVersion: string;
  }) => (
    <>
      <p>version {reactVersion}</p>
      <ul>
        {setupTabs.map((tab) => (
          <li key={tab.id} aria-label={tab.id} data-docs={tab.docs}>
            {tab.html}
          </li>
        ))}
      </ul>
    </>
  ),
}));

import HomePage from "./page";

afterEach(cleanup);

const repoRoot = path.resolve(__dirname, "../../../..");

it("shows the version of the workspace @assistant-ui/react", async () => {
  const { version } = JSON.parse(
    readFileSync(path.join(repoRoot, "packages/react/package.json"), "utf8"),
  ) as { version: string };

  render(await HomePage());

  expect(screen.getByText(`version ${version}`)).toBeTruthy();
});

it("gives the Mastra tab its own snippet and a real docs page", async () => {
  render(await HomePage());

  const mastra = screen.getByRole("listitem", { name: "mastra" });
  const aiSdk = screen.getByRole("listitem", { name: "ai-sdk" });
  expect(mastra.textContent).not.toBe(aiSdk.textContent);
  expect(within(mastra).getByText(/NEXT_PUBLIC_MASTRA_URL/)).toBeTruthy();

  const docs = mastra.getAttribute("data-docs")!;
  expect(
    existsSync(path.join(repoRoot, "apps/docs/content", `${docs}.mdx`)),
  ).toBe(true);
});
