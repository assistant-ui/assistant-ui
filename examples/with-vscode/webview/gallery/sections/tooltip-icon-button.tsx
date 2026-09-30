import { Code2Icon, FileTextIcon, SparklesIcon } from "lucide-react";
import { TooltipIconButton } from "@assistant-ui/ui/components/assistant-ui/elements/tooltip-icon-button.tsx";
import { defineSections } from "../types";
import { OpenOnMount } from "./_chat-helpers";

function Buttons() {
  return (
    <div className="flex items-center gap-3">
      <TooltipIconButton tooltip="Generate" variant="outline">
        <SparklesIcon />
      </TooltipIconButton>
      <TooltipIconButton tooltip="View code" variant="ghost">
        <Code2Icon />
      </TooltipIconButton>
      <TooltipIconButton tooltip="Open file" variant="default">
        <FileTextIcon />
      </TooltipIconButton>
    </div>
  );
}

export default defineSections([
  {
    id: "tooltip-icon-button",
    title: "Tooltip icon button",
    category: "chat",
    notes: "tooltip-icon-button.tsx: outline, ghost and default variants.",
    render: () => <Buttons />,
  },
  {
    id: "tooltip-icon-button-open",
    title: "Tooltip icon button (tooltip open)",
    category: "chat",
    notes: "The first button hovered on mount shows its tooltip.",
    render: () => (
      <OpenOnMount
        selector="button"
        action="hover"
        className="flex h-24 items-start justify-center"
      >
        <Buttons />
      </OpenOnMount>
    ),
  },
]);
