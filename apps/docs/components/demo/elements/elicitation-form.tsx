"use client";

import { useEffect, useState } from "react";
import {
  ElicitationForm,
  type ElicitationField,
  type ElicitationState,
} from "@/components/assistant-ui/elements/elicitation-form";

const INITIAL_FIELDS: readonly ElicitationField[] = [
  {
    name: "repo",
    label: "Repository",
    value: "assistant-ui/assistant-ui",
    kind: "text",
    required: true,
  },
  {
    name: "visibility",
    label: "Visibility",
    value: "Private",
    kind: "choice",
    options: ["Public", "Private"],
  },
  { name: "notify", label: "Notify watchers", value: "true", kind: "toggle" },
];

export function ElicitationFormDemo() {
  const [state, setState] = useState<ElicitationState>("request");
  const [fields, setFields] = useState(INITIAL_FIELDS);

  useEffect(() => {
    if (state === "request") return;
    const id = setTimeout(() => setState("request"), 2400);
    return () => clearTimeout(id);
  }, [state]);

  return (
    <ElicitationForm
      server="github-mcp"
      message="Confirm where the release notes should be published before the tool runs."
      fields={fields}
      state={state}
      onFieldChange={(name, value) =>
        setFields((current) =>
          current.map((item) =>
            item.name === name ? { ...item, value } : item,
          ),
        )
      }
      onAccept={() => setState("accepted")}
      onDecline={() => setState("declined")}
    />
  );
}
