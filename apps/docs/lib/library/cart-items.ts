import { agentSetupPrompt } from "@/lib/agent-setup-prompt";
import {
  STARTERS,
  starterCommand,
  starterId,
  type Starter,
} from "./starters-data";

export type LibraryCartItem = {
  id: string;
  name: string;
  /** What kind of item it is, shown under its name. */
  type: string;
  command: string;
  /** How the item is named in an agent prompt. */
  promptName: string;
};

const fromStarter = (starter: Starter): LibraryCartItem => ({
  id: starterId(starter),
  name: starter.label,
  type: starter.kind === "template" ? "Template" : "Example",
  command: starterCommand(starter),
  promptName: `the \`${starter.name}\` ${starter.kind}`,
});

const ITEMS = new Map(
  STARTERS.map((starter) => {
    const item = fromStarter(starter);
    return [item.id, item] as const;
  }),
);

/** The cart's items in the order they were added; ids no longer in the library are dropped. */
export const getLibraryCartItems = (
  ids: readonly string[],
): LibraryCartItem[] =>
  ids.flatMap((id) => {
    const item = ITEMS.get(id);
    return item ? [item] : [];
  });

export const libraryCartPrompt = (items: readonly LibraryCartItem[]): string =>
  items.length === 1
    ? agentSetupPrompt([], `Start from ${items[0]!.promptName}`)
    : agentSetupPrompt(
        [],
        `Create one project from each of these: ${items
          .map((item) => `${item.promptName} (\`${item.command}\`)`)
          .join(", ")}`,
      );
