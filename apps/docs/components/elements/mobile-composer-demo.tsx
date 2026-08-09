"use client";

import { useState } from "react";
import { MobileComposer } from "@/components/elements/mobile-composer";

const ACTIONS = ["Summarize", "Explain code", "Write tests", "Find a bug"];

export function MobileComposerDemo() {
  const [value, setValue] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  return (
    <MobileComposer
      value={value}
      keyboardOpen={keyboardOpen}
      running={false}
      actions={ACTIONS}
      onValueChange={setValue}
      onAction={(action) => setValue(action)}
      onAttach={() => undefined}
      onFocus={() => setKeyboardOpen(true)}
      onSend={() => {
        setValue("");
        setKeyboardOpen(false);
      }}
    />
  );
}
