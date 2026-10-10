import { afterEach, describe, expect, it, vi } from "vitest";
import { configureVariants } from "./config";
import {
  buildSelection,
  copyText,
  formatVariantsPrompt,
  promptFor,
} from "./prompt";
import type { Snapshot } from "./store";

const location = {
  origin: "http://localhost:3000",
  pathname: "/safe-content-frame",
  search: "?tab=docs&variants=clean&variant=old:x",
  hash: "#faq",
};

const snapshot = {
  groups: [
    {
      id: "scf-card-style",
      label: "Card style",
      variants: [
        { id: "outlined", label: "Outlined" },
        { id: "filled", label: "Filled" },
      ],
      defaultId: undefined,
      persist: true,
      parent: { group: "scf-features", variant: "cards" },
    },
    {
      id: "scf-features",
      label: "Feature list",
      variants: [
        { id: "current", label: "current" },
        { id: "cards", label: "Light cards with icons" },
        { id: "grid", label: "Grid" },
      ],
      defaultId: "current",
      persist: true,
      parent: undefined,
    },
    {
      id: "scf-cta",
      label: "scf-cta",
      variants: [
        { id: "button", label: "Button" },
        { id: "link", label: "link" },
      ],
      defaultId: undefined,
      persist: true,
      parent: undefined,
    },
  ],
  selections: { "scf-features": "cards", "scf-cta": "link" },
  hideUI: false,
  clean: false,
  collapsed: false,
  outline: true,
  canvas: false,
  canvasRows: [],
  focus: undefined,
  highlight: undefined,
  notes: [],
  notesMode: "session",
  agent: { connected: false, status: {} },
} satisfies Snapshot;

afterEach(() => {
  configureVariants({});
});

describe("buildSelection", () => {
  it("lists mounted groups parents first with their kept and removed variants", () => {
    const selection = buildSelection(snapshot, location);
    expect(selection.scope).toBe("page");
    expect(selection.url).toBe(
      "http://localhost:3000/safe-content-frame?tab=docs&variant=scf-features:cards&variant=scf-card-style:outlined&variant=scf-cta:link#faq",
    );
    expect(selection.groups.map((group) => group.id)).toEqual([
      "scf-features",
      "scf-card-style",
      "scf-cta",
    ]);
    expect(selection.groups[0]).toEqual({
      id: "scf-features",
      label: "Feature list",
      kept: { id: "cards", label: "Light cards with icons" },
      removed: [
        { id: "current", label: "current" },
        { id: "grid", label: "Grid" },
      ],
      parent: undefined,
    });
    expect(selection.groups[1]!.parent).toEqual({
      group: "scf-features",
      variant: "cards",
    });
  });

  it("narrows to one group", () => {
    const selection = buildSelection(snapshot, location, "scf-cta");
    expect(selection.scope).toBe("group");
    expect(selection.groups.map((group) => group.id)).toEqual(["scf-cta"]);
  });

  it("keeps the ancestors' selections in a nested group's URL", () => {
    const selection = buildSelection(snapshot, location, "scf-card-style");
    expect(selection.groups.map((group) => group.id)).toEqual([
      "scf-card-style",
    ]);
    expect(selection.url).toBe(
      "http://localhost:3000/safe-content-frame?tab=docs&variant=scf-card-style:outlined&variant=scf-features:cards#faq",
    );
  });
});

describe("prompt", () => {
  it("copies one /variants choose command for the whole page", () => {
    expect(promptFor(snapshot, location)).toBe(
      "/variants choose scf-features:cards scf-card-style:outlined scf-cta:link",
    );
  });

  it("copies a command for one group", () => {
    expect(promptFor(snapshot, location, "scf-cta")).toBe(
      "/variants choose scf-cta:link",
    );
  });

  it("formats any selection the same way", () => {
    expect(
      formatVariantsPrompt({
        scope: "group",
        pathname: "/",
        url: "http://x/",
        groups: [
          {
            id: "g",
            label: "g",
            kept: { id: "a", label: "a" },
            removed: [],
            parent: undefined,
          },
        ],
        notes: [],
      }),
    ).toBe("/variants choose g:a");
  });

  it("appends notes kept in this tab after `-- notes:`", () => {
    const withNotes = {
      ...snapshot,
      notes: [
        {
          id: "n-00000001",
          group: "scf-cta",
          variant: "link",
          note: 'smaller "arrow"',
          hint: "a > svg (icon); b",
          source: "session" as const,
        },
        {
          id: "n-00000002",
          group: "scf-features",
          variant: undefined,
          note: "tighter spacing",
          source: "session" as const,
        },
        {
          id: "n-00000003",
          group: "scf-features",
          variant: "cards",
          note: "already in source",
          source: "file" as const,
        },
        {
          id: "n-00000004",
          group: "elsewhere",
          variant: undefined,
          note: "not mounted",
          source: "session" as const,
        },
      ],
    };
    expect(promptFor(withNotes, location)).toBe(
      '/variants choose scf-features:cards scf-card-style:outlined scf-cta:link -- notes: scf-cta:link "smaller \\"arrow\\"" (on: a > svg icon b); scf-features "tighter spacing"',
    );
    expect(promptFor(withNotes, location, "scf-cta")).toBe(
      '/variants choose scf-cta:link -- notes: scf-cta:link "smaller \\"arrow\\"" (on: a > svg icon b)',
    );
  });

  it("uses a custom formatter", () => {
    configureVariants({
      prompt: (selection) =>
        `${selection.scope}: ${selection.groups
          .map((group) => `${group.id}=${group.kept.id}`)
          .join(" ")} on ${selection.pathname}`,
    });
    expect(promptFor(snapshot, location)).toBe(
      "page: scf-features=cards scf-card-style=outlined scf-cta=link on /safe-content-frame",
    );
  });
});

describe("copyText", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  afterEach(() => {
    if (original) Object.defineProperty(navigator, "clipboard", original);
    else delete (navigator as { clipboard?: unknown }).clipboard;
    delete (document as { execCommand?: unknown }).execCommand;
  });

  const setClipboard = (value: unknown) =>
    Object.defineProperty(navigator, "clipboard", {
      value,
      configurable: true,
    });

  it("uses the async Clipboard API", async () => {
    const writeText = vi.fn(async () => {});
    setClipboard({ writeText });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to a hidden textarea and restores focus", async () => {
    setClipboard({
      writeText: vi.fn(async () => {
        throw new Error("denied");
      }),
    });
    let copied = "";
    (document as { execCommand?: unknown }).execCommand = vi.fn(() => {
      copied = (document.activeElement as HTMLTextAreaElement).value;
      return true;
    });
    const button = document.createElement("button");
    document.body.append(button);
    await expect(copyText("fallback", button)).resolves.toBe(true);
    expect(copied).toBe("fallback");
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.activeElement).toBe(button);
    button.remove();
  });

  it("reports failure when nothing can copy", async () => {
    setClipboard(undefined);
    (document as { execCommand?: unknown }).execCommand = vi.fn(() => {
      throw new Error("unsupported");
    });
    await expect(copyText("nope")).resolves.toBe(false);
  });
});
