import { describe, expect, it } from "vitest";
import {
  cartCommands,
  cartPrompt,
  installCommand,
  installLabel,
  libraryCategoryAt,
  libraryCategoryHref,
  matchesLibraryQuery,
  type LibraryInstall,
  type LibraryItem,
} from "./catalog";

const item = (
  id: string,
  install?: LibraryInstall,
  prompt = `Set up ${id}`,
): LibraryItem => ({
  id,
  category: "components",
  name: id,
  description: `The ${id} part.`,
  href: `/elements/${id}`,
  external: false,
  prompt,
  ...(install && { install }),
});

describe("library addresses", () => {
  it("puts every category under /library and reads it back from the path", () => {
    expect(libraryCategoryHref("runtimes")).toBe("/library/runtimes");
    expect(libraryCategoryAt("/library/runtimes")).toBe("runtimes");
    expect(libraryCategoryAt("/library/themes/new")).toBe("themes");
  });

  it("finds no category on the library's home, setup, or outside it", () => {
    expect(libraryCategoryAt("/library")).toBeNull();
    expect(libraryCategoryAt("/library/setup")).toBeNull();
    expect(libraryCategoryAt("/runtimes")).toBeNull();
  });
});

describe("install commands", () => {
  it("writes the command for each installer and labels it by what it installs", () => {
    const shadcn = { kind: "shadcn", names: ["@assistant-ui/thread"] } as const;
    const npm = { kind: "npm", names: ["@assistant-ui/react", "zod"] } as const;
    const command = {
      kind: "command",
      command: "npx assistant-ui init",
    } as const;

    expect(installCommand(shadcn)).toBe(
      "npx shadcn@latest add @assistant-ui/thread",
    );
    expect(installCommand(npm)).toBe("npm install @assistant-ui/react zod");
    expect(installCommand(command)).toBe("npx assistant-ui init");
    expect(installLabel(npm)).toBe("@assistant-ui/react zod");
    expect(installLabel(command)).toBe("npx assistant-ui init");
  });

  it("combines a cart into one run per installer, scaffolding only the first starter", () => {
    const commands = cartCommands([
      item("thread", { kind: "shadcn", names: ["@assistant-ui/thread"] }),
      item("starter", {
        kind: "command",
        command: "npx assistant-ui@latest create my-app",
      }),
      item("other-starter", {
        kind: "command",
        command: "npx assistant-ui@latest create my-app -t mcp",
      }),
      item("markdown", {
        kind: "shadcn",
        names: ["@assistant-ui/markdown-text", "@assistant-ui/thread"],
      }),
      item("frame", { kind: "npm", names: ["generative-frame"] }),
      item("theme", { kind: "command", command: "npx shadcn@latest apply x" }),
      item("guide"),
    ]);

    expect(commands).toEqual([
      "npx assistant-ui@latest create my-app",
      "cd my-app",
      "npx shadcn@latest add @assistant-ui/thread @assistant-ui/markdown-text",
      "npm install generative-frame",
      "npx shadcn@latest apply x",
    ]);
  });

  it("installs in place when the cart has no starter", () => {
    expect(
      cartCommands([item("frame", { kind: "npm", names: ["zod"] })]),
    ).toEqual(["npm install zod"]);
  });

  it("asks the agent for each distinct prompt once", () => {
    expect(
      cartPrompt([
        item("a", undefined, "Set up the thread"),
        item("b", undefined, "Set up the thread"),
        item("c", undefined, "Add the theme"),
      ]),
    ).toBe("Set up the thread\nAdd the theme");
  });
});

describe("library search", () => {
  const thread = item("thread-list");

  it("matches the name, description, or id regardless of case and padding", () => {
    expect(matchesLibraryQuery(thread, "  THREAD ")).toBe(true);
    expect(matchesLibraryQuery(thread, "part")).toBe(true);
    expect(matchesLibraryQuery(thread, "composer")).toBe(false);
  });

  it("matches everything when the query is blank", () => {
    expect(matchesLibraryQuery(thread, "   ")).toBe(true);
  });
});
