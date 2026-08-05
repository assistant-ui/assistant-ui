"use client";

import { useState } from "react";
import { Composer, type ComposerPerson } from "@/components/elements/composer";

const PEOPLE: ComposerPerson[] = [
  { name: "Mara", role: "human" },
  { name: "Max", role: "agent" },
  { name: "Aiden", role: "agent" },
  { name: "Ana", role: "human" },
];

export function ComposerMentionsDemo() {
  const [value, setValue] = useState("Ask @");

  return (
    <div className="flex w-full max-w-lg flex-col">
      <div aria-hidden className="h-44" />
      <Composer
        value={value}
        onValueChange={setValue}
        onSend={() => setValue("")}
        placeholder="Type @ to mention"
        people={PEOPLE}
      />
    </div>
  );
}
