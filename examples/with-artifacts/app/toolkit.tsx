"use generative";

import { defineToolkit, unstable_interactableTool } from "@assistant-ui/react";
import { ArtifactTrigger } from "./artifact-surface";
import { artifactDescription, artifactSchema } from "./artifact-state";

export default defineToolkit({
  artifact: unstable_interactableTool({
    description: artifactDescription,
    stateSchema: artifactSchema,
    render: (props) => <ArtifactTrigger {...props} />,
  }),
});
