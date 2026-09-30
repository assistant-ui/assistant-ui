import {
  ModelSelector,
  type ModelOption,
} from "@assistant-ui/ui/components/assistant-ui/elements/model-selector.aui.tsx";
import {
  ClaudeLogo,
  GeminiLogo,
  OpenAILogo,
} from "@assistant-ui/ui/components/assistant-ui/elements/logos.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";
import { galleryView } from "../view";

const MODELS: ModelOption[] = [
  {
    id: "claude-opus",
    name: "Claude Opus 5.5",
    description: "1M context window",
    icon: <ClaudeLogo className="size-4" />,
    efforts: true,
  },
  {
    id: "claude-haiku",
    name: "Claude Haiku 4.5",
    description: "200K context window",
    icon: <ClaudeLogo className="size-4" />,
  },
  {
    id: "gpt",
    name: "GPT-5.2",
    description: "400K context window",
    icon: <OpenAILogo className="size-4" />,
    efforts: true,
  },
  {
    id: "gemini",
    name: "Gemini 3 Pro",
    description: "1M context window",
    icon: <GeminiLogo className="size-4" />,
  },
  { id: "local", name: "Local model (unavailable)", disabled: true },
];

export default defineSections([
  {
    id: "model-selector",
    title: "Model selector",
    category: "chat",
    notes:
      "model-selector.aui.tsx, registered with the model context: the outline, ghost and muted triggers.",
    render: () => (
      <SeededRuntime>
        <div className="flex flex-wrap items-center gap-3">
          <ModelSelector
            models={MODELS}
            defaultValue="claude-opus"
            variant="outline"
          />
          <ModelSelector models={MODELS} defaultValue="gpt" variant="ghost" />
          <ModelSelector
            models={MODELS}
            defaultValue="gemini"
            variant="muted"
          />
        </div>
      </SeededRuntime>
    ),
  },
  {
    id: "model-selector-open",
    title: "Model selector (open)",
    category: "chat",
    notes:
      "defaultOpen, searchable, with the reasoning-effort row for the selected model. Open only when the section is shown alone: with every section mounted, the open popup's positioning loops synchronously and freezes the page.",
    render: () => (
      <SeededRuntime>
        <div className="h-110">
          <ModelSelector
            models={MODELS}
            defaultValue="claude-opus"
            defaultEffort="medium"
            searchable
            defaultOpen={galleryView.get().section === "model-selector-open"}
          />
        </div>
      </SeededRuntime>
    ),
  },
]);
