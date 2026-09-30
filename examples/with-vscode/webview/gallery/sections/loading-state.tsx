import { useEffect, useState } from "react";
import {
  GenerationLoader,
  type GenerationLoaderVariant,
} from "@assistant-ui/ui/components/assistant-ui/elements/loading-state.tsx";
import { defineSections } from "../types";

/** Tenths of a second since mount, as the docs demo's useElapsed. */
function useTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function Loader({ variant }: { variant: GenerationLoaderVariant }) {
  const tick = useTick();
  return <GenerationLoader label="Generating" tick={tick} variant={variant} />;
}

export default defineSections([
  {
    id: "loading-state",
    title: "Loading state",
    category: "chat",
    notes:
      "loading-state.tsx (standalone) GenerationLoader: dots, squares and rounded.",
    render: () => (
      <div className="flex flex-col gap-4">
        <Loader variant="dots" />
        <Loader variant="squares" />
        <Loader variant="rounded" />
      </div>
    ),
  },
]);
