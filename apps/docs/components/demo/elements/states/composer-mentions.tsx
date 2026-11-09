"use client";

import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerBar,
  ComposerInput,
  ComposerMenu,
  ComposerPersonItem,
  ComposerSend,
  ComposerToolbar,
  useMentionMatches,
  type ComposerPerson,
} from "@/components/assistant-ui/elements/composer";
import { defineStates } from "./types";

const noop = () => {};

const PEOPLE: ComposerPerson[] = [
  { name: "Mara", role: "human" },
  { name: "Max", role: "agent" },
  { name: "Aiden", role: "agent" },
  { name: "Ana", role: "human" },
];

const LONG_PEOPLE: ComposerPerson[] = [
  { name: "Release_Coordinator_Agent_Staging", role: "agent" },
  { name: "Rosalind_Featherstonehaugh", role: "human" },
];

function Mentions({
  value,
  people = PEOPLE,
}: {
  value: string;
  people?: ComposerPerson[];
}) {
  const matches = useMentionMatches(value, people);
  return (
    <div className="flex w-full max-w-lg flex-col">
      <div aria-hidden className="h-44" />
      <Composer>
        <ComposerMenu open={matches.length > 0}>
          {matches.map((person, i) => (
            <ComposerPersonItem
              key={person.name}
              person={person}
              active={i === 0}
              onClick={noop}
            />
          ))}
        </ComposerMenu>
        <ComposerBar>
          <ComposerInput
            value={value}
            placeholder="Ask anything"
            onChange={noop}
            onSubmit={noop}
          />
          <ComposerToolbar>
            <ComposerActions>
              <ComposerAttachButton onClick={noop} />
            </ComposerActions>
            <ComposerActions>
              <ComposerSend
                streaming={false}
                idle={value.length === 0}
                onClick={noop}
              />
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </Composer>
    </div>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "filtered",
    label: "Filtered",
    note: "Letters after the @ narrow the list to matching names.",
    Component: () => <Mentions value="Loop in @Ma" />,
  },
  {
    key: "no-matches",
    label: "No matches",
    note: "Nobody matches the name, so the menu hides.",
    Component: () => <Mentions value="Ask @Zoe" />,
  },
  {
    key: "completed",
    label: "Completed",
    note: "A finished mention ends in a space and closes the menu.",
    Component: () => <Mentions value="Ask @Mara to review the migration " />,
  },
  {
    key: "long-content",
    label: "Long names",
    note: "Long names truncate and keep the role tag visible.",
    Component: () => <Mentions value="Hand this to @R" people={LONG_PEOPLE} />,
  },
]);
