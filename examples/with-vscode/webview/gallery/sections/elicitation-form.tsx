import { useState } from "react";
import {
  ElicitationForm,
  type ElicitationField,
  type ElicitationState,
} from "@assistant-ui/ui/components/assistant-ui/elements/elicitation-form.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const FIELDS: readonly ElicitationField[] = [
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

const FORM = {
  server: "github-mcp",
  message:
    "Confirm where the release notes should be published before the tool runs.",
  fields: FIELDS,
};

function InteractiveForm() {
  const [state, setState] = useState<ElicitationState>("request");
  return (
    <ElicitationForm
      {...FORM}
      state={state}
      onAccept={() => setState("accepted")}
      onDecline={() => setState("declined")}
    />
  );
}

export default defineSections([
  {
    id: "elicitation-form",
    title: "Elicitation form",
    category: "agents",
    notes: "An MCP server asks for input; accept or decline settles it.",
    render: () => <InteractiveForm />,
  },
  {
    id: "elicitation-form-states",
    title: "Elicitation form states",
    category: "agents",
    notes: "Accepted, declined, and a request with long values.",
    render: () => (
      <States>
        <State label="accepted">
          <ElicitationForm {...FORM} state="accepted" />
        </State>
        <State label="declined">
          <ElicitationForm {...FORM} state="declined" />
        </State>
        <State label="long values">
          <ElicitationForm
            server="deployment-orchestrator-mcp.internal.example.com"
            message="Pick the environment and the release channel. The deployment waits until you answer."
            fields={[
              {
                name: "branch",
                label: "Branch",
                value: "vscode/06-gallery-agents-with-a-long-branch-name",
                kind: "text",
                required: true,
              },
              {
                name: "env",
                label: "Environment",
                value: "staging-eu-west",
                kind: "choice",
                options: ["production-us-east", "staging-eu-west", "preview"],
              },
              {
                name: "canary",
                label: "Canary",
                value: "false",
                kind: "toggle",
              },
            ]}
            state="request"
            onAccept={() => {}}
            onDecline={() => {}}
          />
        </State>
      </States>
    ),
  },
]);
