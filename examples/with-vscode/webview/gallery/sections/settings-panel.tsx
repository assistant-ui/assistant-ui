import { useState } from "react";
import {
  SettingsPanel,
  type SettingToggle,
} from "@assistant-ui/ui/components/assistant-ui/elements/settings-panel.tsx";
import { defineSections } from "../types";

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

function SettingsPanelExample() {
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

export default defineSections([
  {
    id: "settings-panel",
    title: "Settings panel",
    category: "chat",
    notes:
      "settings-panel.tsx (standalone): model, system prompt, temperature and toggles.",
    render: () => <SettingsPanelExample />,
  },
]);
