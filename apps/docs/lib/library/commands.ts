import type { LibraryFact } from "./facts";

export type LibraryCommandGroup = "install" | "agent";

/** One way to get an item into a project: a command to run, an address, or what to tell a coding agent. */
export type LibraryCommand = {
  group: LibraryCommandGroup;
  label: string;
  command: string;
  note?: string;
};

const REGISTRY = "https://r.assistant-ui.com";

const quote = (text: string) => `"${text.replace(/(["\\$`])/g, "\\$1")}"`;

/**
 * Every way to install or run an item, the first being the command the
 * library shows for it, followed by what to hand a coding agent.
 */
export const libraryCommands = ({
  command,
  prompt,
  fact,
}: {
  command: string | undefined;
  prompt: string | undefined;
  fact: LibraryFact | undefined;
}): LibraryCommand[] => {
  const out: LibraryCommand[] = [];
  const add = (
    group: LibraryCommandGroup,
    label: string,
    text: string | undefined,
    note?: string,
  ) => {
    if (!text || out.some((entry) => entry.command === text)) return;
    out.push({ group, label, command: text, ...(note && { note }) });
  };

  add(
    "install",
    command?.startsWith("npx skills") ? "Add" : "Install",
    command,
  );
  const registry = fact?.registry;
  if (registry?.react) {
    add(
      "install",
      "With the assistant-ui CLI",
      `npx assistant-ui@latest add ${registry.react}`,
    );
    add(
      "install",
      "Registry file",
      `${REGISTRY}/${registry.react}.json`,
      "what the command reads",
    );
  }
  if (registry?.native) {
    add(
      "install",
      "React Native",
      `npx shadcn@latest add ${REGISTRY}/native/${registry.native}.json`,
    );
  }
  if (registry?.vue) {
    add(
      "install",
      "Vue",
      `npx shadcn-vue@latest add ${REGISTRY}/vue/${registry.vue}.json`,
    );
  }
  if (command?.startsWith("npm install ")) {
    const packages = command.slice("npm install ".length);
    add("install", "pnpm", `pnpm add ${packages}`);
    add("install", "yarn", `yarn add ${packages}`);
    add("install", "bun", `bun add ${packages}`);
  }
  if (prompt) {
    add(
      "agent",
      "Prompt for your agent",
      prompt,
      "paste into any coding agent",
    );
    add(
      "agent",
      "Run it with Claude Code",
      `npx assistant-ui@latest agent ${quote(prompt)}`,
      "opens Claude Code with the assistant-ui skills",
    );
  }
  add(
    "agent",
    "Guided setup",
    "npx assistant-ui@latest setup",
    "assistant-ui's own setup, in the browser",
  );
  return out;
};
