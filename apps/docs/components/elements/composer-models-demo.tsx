"use client";

import { useState } from "react";
import { Composer, type ComposerModel } from "@/components/elements/composer";

const MODELS: ComposerModel[] = [
  { name: "Fable 5", meta: "1M ctx" },
  { name: "Opus 5", meta: "400k ctx" },
  { name: "Haiku 4.5", meta: "200k ctx" },
];

export function ComposerModelsDemo() {
  const [value, setValue] = useState("");
  const [model, setModel] = useState("Fable 5");

  return (
    <div className="flex w-full max-w-lg flex-col">
      <div aria-hidden className="h-40" />
      <Composer
        value={value}
        onValueChange={setValue}
        onSend={() => setValue("")}
        models={MODELS}
        model={model}
        onModelChange={setModel}
        defaultModelMenuOpen
      />
    </div>
  );
}
