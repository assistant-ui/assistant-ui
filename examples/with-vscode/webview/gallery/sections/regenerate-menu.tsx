import { useState } from "react";
import {
  RegenerateMenu,
  type RegenerateOption,
} from "@assistant-ui/ui/components/assistant-ui/elements/regenerate-menu.tsx";
import { defineSections } from "../types";

const OPTIONS: readonly RegenerateOption[] = [
  { id: "opus", label: "Try again with Opus 5", detail: "slower" },
  { id: "sonnet", label: "Try again with Sonnet 5", detail: "balanced" },
  { id: "haiku", label: "Try again with Haiku 4.5", detail: "fastest" },
];

function RegenerateMenuExample({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <RegenerateMenu
      options={OPTIONS}
      open={open}
      currentId="sonnet"
      onOpenChange={setOpen}
      onPick={() => setOpen(false)}
    />
  );
}

export default defineSections([
  {
    id: "regenerate-menu",
    title: "Regenerate menu (closed)",
    category: "chat",
    notes: "regenerate-menu.tsx (standalone).",
    render: () => <RegenerateMenuExample initialOpen={false} />,
  },
  {
    id: "regenerate-menu-open",
    title: "Regenerate menu (open)",
    category: "chat",
    render: () => <RegenerateMenuExample initialOpen />,
  },
]);
