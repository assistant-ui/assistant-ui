"use client";

import {
  defineToolkit,
  htmlArtifact,
  reactArtifact,
} from "@assistant-ui/react";

export default defineToolkit({
  create_html_artifact: htmlArtifact(),
  create_react_artifact: reactArtifact(),
});
