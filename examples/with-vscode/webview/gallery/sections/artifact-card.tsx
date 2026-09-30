import { ArtifactCard } from "@assistant-ui/ui/components/assistant-ui/elements/artifact-card.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

export default defineSections([
  {
    id: "artifact-card",
    title: "Artifact card",
    category: "agents",
    notes: "Generating with a word count, ready, and a long title.",
    render: () => (
      <States>
        <State label="generating">
          <ArtifactCard
            title="Draft persistence RFC"
            meta="Document · v3 · writing"
            generating
            words={128}
          />
        </State>
        <State label="ready">
          <ArtifactCard
            title="Draft persistence RFC"
            meta="Document · v3 · just now"
            words={214}
          />
        </State>
        <State label="long title">
          <ArtifactCard
            title="Migration guide for moving every thread list adapter to the tap resource model"
            meta="Document · v12 · edited 3 minutes ago by the maintainer agent"
            words={4096}
          />
        </State>
      </States>
    ),
  },
]);
