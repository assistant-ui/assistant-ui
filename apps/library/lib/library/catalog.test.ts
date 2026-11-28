import { describe, expect, it } from "vitest";
import { cartCommands, type LibraryItem } from "./catalog";
import { themePresetUrl, type ThemeSettings } from "./themes";

function item(
  id: string,
  install: NonNullable<LibraryItem["install"]>,
  category: LibraryItem["category"] = "starters",
): LibraryItem {
  return {
    id,
    category,
    name: id,
    description: "",
    href: `/${category}`,
    external: false,
    install,
    prompt: id,
  };
}

const starter = item("default", {
  kind: "command",
  command: "npx assistant-ui@latest create my-app",
});
const minimal = item("minimal", {
  kind: "command",
  command: "npx assistant-ui@latest create my-app -t minimal",
});
const cloud = item("cloud-harness", {
  kind: "command",
  command: "npx assistant-ui@latest cloud setup my-app",
});
const component = item(
  "button",
  { kind: "shadcn", names: ["button"] },
  "components",
);
const adapter = item(
  "adapter",
  { kind: "npm", names: ["@assistant-ui/react"] },
  "runtimes",
);
const theme = item(
  "theme",
  {
    kind: "command",
    command: "npx shadcn@latest apply nova",
  },
  "themes",
);
const skill = item(
  "skill",
  {
    kind: "command",
    command: "npx skills add assistant-ui/skills",
  },
  "skills",
);

describe("cartCommands", () => {
  it("scaffolds and enters the new project before running installers", () => {
    expect(cartCommands([adapter, theme, starter, component])).toEqual([
      "npx assistant-ui@latest create my-app",
      "cd my-app",
      "npx shadcn@latest add button",
      "npm install @assistant-ui/react",
      "npx shadcn@latest apply nova",
    ]);
  });

  it("scaffolds only the first starter", () => {
    expect(cartCommands([minimal, starter])).toEqual([
      "npx assistant-ui@latest create my-app -t minimal",
      "cd my-app",
    ]);
  });

  it("lets Cloud setup take the same single scaffold slot as a starter", () => {
    expect(cartCommands([cloud, starter])).toEqual([
      "npx assistant-ui@latest cloud setup my-app",
      "cd my-app",
    ]);
    expect(cartCommands([starter, cloud])).toEqual([
      "npx assistant-ui@latest create my-app",
      "cd my-app",
    ]);
  });

  it("keeps grouped installers and the order of other commands for an existing project", () => {
    expect(cartCommands([skill, adapter, theme, component])).toEqual([
      "npx shadcn@latest add button",
      "npm install @assistant-ui/react",
      "npx skills add assistant-ui/skills",
      "npx shadcn@latest apply nova",
    ]);
  });
});

describe("themePresetUrl", () => {
  const settings: ThemeSettings = {
    style: "nova",
    baseColor: "neutral",
    theme: "base",
    chartColor: "base",
    iconLibrary: "lucide",
    font: "inter",
    fontHeading: "inherit",
    radius: "default",
    menuAccent: "subtle",
    menuColor: "default",
  };

  it("sends the base color when charts use it", () => {
    expect(
      new URL(themePresetUrl(settings)).searchParams.get("chartColor"),
    ).toBe("neutral");
  });

  it("sends a chart accent separately from the theme accent", () => {
    const url = new URL(
      themePresetUrl({ ...settings, theme: "blue", chartColor: "amber" }),
    );
    expect(url.searchParams.get("theme")).toBe("blue");
    expect(url.searchParams.get("chartColor")).toBe("amber");
  });
});
