import { useState } from "react";
import { MobileComposer } from "@assistant-ui/ui/components/assistant-ui/elements/mobile-composer.tsx";
import { defineSections } from "../types";

const ACTIONS = ["Summarize", "Explain code", "Write tests", "Find a bug"];

function MobileComposerExample({
  keyboard = false,
  initialValue = "",
}: {
  keyboard?: boolean;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [keyboardOpen, setKeyboardOpen] = useState(keyboard);
  return (
    <MobileComposer
      value={value}
      keyboardOpen={keyboardOpen}
      running={false}
      actions={ACTIONS}
      onValueChange={setValue}
      onAction={setValue}
      onAttach={() => {}}
      onFocus={() => setKeyboardOpen(true)}
      onSend={() => {
        setValue("");
        setKeyboardOpen(false);
      }}
    />
  );
}

export default defineSections([
  {
    id: "mobile-composer",
    title: "Mobile composer",
    category: "chat",
    notes: "Idle, with quick actions.",
    render: () => <MobileComposerExample />,
  },
  {
    id: "mobile-composer-keyboard",
    title: "Mobile composer (keyboard open)",
    category: "chat",
    render: () => (
      <MobileComposerExample
        keyboard
        initialValue="Write tests for the draft store"
      />
    ),
  },
]);
