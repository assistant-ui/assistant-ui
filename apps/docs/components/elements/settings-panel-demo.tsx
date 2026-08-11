"use client";

import { useState } from "react";
import {
  SettingsPanel,
  type SettingToggle,
} from "@/components/elements/settings-panel";

const MODELS = ["Opus", "Sonnet", "Haiku"] as const;

const INITIAL: readonly SettingToggle[] = [
  {
    key: "tools",
    label: "Tool use",
    detail: "Let the model call your tools",
    on: true,
  },
  {
    key: "memory",
    label: "Memory",
    detail: "Remember facts between threads",
    on: false,
  },
];

export function SettingsPanelDemo() {
  const [model, setModel] = useState("Sonnet");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a careful engineering assistant. Prefer the repo's existing conventions over your own.",
  );
  const [temperature, setTemperature] = useState(0.7);
  const [toggles, setToggles] = useState(INITIAL);

  return (
    <SettingsPanel
      model={model}
      models={MODELS}
      systemPrompt={systemPrompt}
      temperature={temperature}
      toggles={toggles}
      onModelChange={setModel}
      onSystemPromptChange={setSystemPrompt}
      onTemperatureChange={setTemperature}
      onToggle={(key) =>
        setToggles((current) =>
          current.map((toggle) =>
            toggle.key === key ? { ...toggle, on: !toggle.on } : toggle,
          ),
        )
      }
    />
  );
}
