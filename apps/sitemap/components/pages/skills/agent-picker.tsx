"use client";

import { useState } from "react";
import { AgentIcon } from "@/components/library/agent-icons";
import {
  PanelCopy,
  Picker,
  pickerHeader,
} from "@/components/pages/skills/picker-parts";
import { DeferredHighlight } from "@/components/shared/deferred-highlight";
import { DemoFrame } from "@/components/shared/demo-frame";
import type { LibraryItem } from "@/lib/library/catalog";

const folderOf = (agent: LibraryItem) =>
  agent.description.replace(/^Installs into /, "").replace(/\.$/, "");

const commandOf = (agent: LibraryItem) =>
  agent.install?.kind === "command" ? agent.install.command : "";

/** Pick an agent and see the command that installs the skills into it, and where they land. */
export function AgentPicker({
  agents,
  skillNames,
}: {
  agents: readonly LibraryItem[];
  skillNames: readonly string[];
}) {
  const [id, setId] = useState(
    agents.find((agent) => agent.id === "skills/claude-code")?.id ??
      agents[0]!.id,
  );
  const agent = agents.find((entry) => entry.id === id) ?? agents[0]!;
  const folder = folderOf(agent);
  const command = commandOf(agent);

  return (
    <DemoFrame
      caption={`${agent.name} reads skills from ${folder}.`}
      frameClassName="h-[24rem]"
    >
      <div className={pickerHeader}>
        <Picker
          label="Agent"
          searchable
          options={agents.map((entry) => ({
            id: entry.id,
            label: entry.name,
            icon: (
              <AgentIcon
                id={entry.id}
                fallback={
                  <span className="text-muted-foreground text-[11px] font-medium">
                    {entry.name.charAt(0)}
                  </span>
                }
              />
            ),
          }))}
          value={agent.id}
          onValue={setId}
        />
        <span className="ms-auto" />
        <PanelCopy
          text={command}
          label={`Copy the command for ${agent.name}`}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed [font-variant-ligatures:none]">
        <div className="[&_code]:[overflow-wrap:anywhere] [&_code]:whitespace-pre-wrap [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0">
          <DeferredHighlight
            key={agent.id}
            language="bash"
            theme={{ light: "github-light", dark: "github-dark" }}
            defaultColor="light-dark()"
            addDefaultStyles={false}
            showLanguage={false}
          >
            {command}
          </DeferredHighlight>
        </div>
        <p className="text-muted-foreground mt-4">{folder}/</p>
        <ul aria-label={`What lands in ${folder}`}>
          {skillNames.map((name) => (
            <li key={name} className="ps-4">
              <span className="text-muted-foreground">{name}/</span>SKILL.md
            </li>
          ))}
        </ul>
      </div>
    </DemoFrame>
  );
}
