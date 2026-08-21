"use client";

import { useState } from "react";
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
  applyMention,
  useMentionMatches,
  type ComposerPerson,
} from "@/components/assistant-ui/elements/composer";

const PEOPLE: ComposerPerson[] = [
  { name: "Mara", role: "human" },
  { name: "Max", role: "agent" },
  { name: "Aiden", role: "agent" },
  { name: "Ana", role: "human" },
];

export function ComposerMentionsDemo() {
  const [value, setValue] = useState("Ask @");
  const matches = useMentionMatches(value, PEOPLE);

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
              onClick={() => setValue(applyMention(value, person.name))}
            />
          ))}
        </ComposerMenu>
        <ComposerBar>
          <ComposerInput
            value={value}
            placeholder="Ask anything"
            onChange={(event) => setValue(event.target.value)}
            onSubmit={() => {
              const person = matches[0];
              setValue(person ? applyMention(value, person.name) : "");
            }}
          />
          <ComposerToolbar>
            <ComposerActions>
              <ComposerAttachButton onClick={() => undefined} />
            </ComposerActions>
            <ComposerActions>
              <ComposerSend
                streaming={false}
                idle={value.length === 0}
                onClick={() => setValue("")}
              />
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </Composer>
    </div>
  );
}
