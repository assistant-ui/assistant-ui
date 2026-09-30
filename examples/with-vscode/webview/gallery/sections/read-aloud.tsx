import { ReadAloud } from "@assistant-ui/ui/components/assistant-ui/elements/read-aloud.tsx";
import { defineSections } from "../types";

const WORDS =
  "The converter dropped parts with no text, so the guard now keeps them and the suite passes again.".split(
    " ",
  );

export default defineSections([
  {
    id: "read-aloud",
    title: "Read aloud",
    category: "chat",
    notes:
      "read-aloud.tsx (standalone) driven by props: playing at 1.25x, word 7 spoken. Nothing is spoken; the webview has no speech output wired.",
    render: () => (
      <div className="flex flex-col gap-4">
        <ReadAloud
          words={WORDS}
          spokenIndex={7}
          playing
          rate={1.25}
          elapsed="0:01"
          duration="0:04"
          onToggle={() => {}}
          onRateChange={() => {}}
        />
        <ReadAloud
          words={WORDS}
          spokenIndex={0}
          playing={false}
          rate={1}
          elapsed="0:00"
          duration="0:05"
          onToggle={() => {}}
          onRateChange={() => {}}
        />
      </div>
    ),
  },
]);
