"use client";

import { hasAgentIcon } from "@/components/library/agent-icons";
import { ItemMark } from "@/components/library/item-mark";
import { ItemMenu } from "@/components/library/item-menu";
import type { LibraryItem } from "@/lib/library/catalog";

/** The agents the skills install into: icon, name, folder, and the library's add or copy menu. */
export function AgentList({ agents }: { agents: readonly LibraryItem[] }) {
  return (
    <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <li
          key={agent.id}
          className="hover:bg-foreground/[0.025] rounded-control -mx-2 flex items-center gap-3 px-2 py-2 transition-colors"
        >
          {hasAgentIcon(agent.id) ? (
            <ItemMark item={agent} />
          ) : (
            <span
              aria-hidden
              className="border-foreground/10 bg-background rounded-document text-muted-foreground grid size-11 shrink-0 place-items-center border text-base font-medium"
            >
              {agent.name.charAt(0)}
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{agent.name}</span>
            <span className="text-muted-foreground truncate font-mono text-xs [font-variant-ligatures:none]">
              {agent.description
                .replace(/^Installs into /, "")
                .replace(/\.$/, "")}
            </span>
          </span>
          <ItemMenu item={agent} />
        </li>
      ))}
    </ul>
  );
}
