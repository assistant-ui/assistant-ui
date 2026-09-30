import { GuardrailNotice } from "@assistant-ui/ui/components/assistant-ui/elements/guardrail-notice.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

export default defineSections([
  {
    id: "guardrail-notice",
    title: "Guardrail notice",
    category: "agents",
    notes: "A refusal with alternatives to pick, and one without alternatives.",
    render: () => (
      <States>
        <State label="with alternatives">
          <GuardrailNotice
            title="I can't help with that"
            explanation="This asks for a working attack against infrastructure you don't own. I can help with the defensive side of the same problem."
            policy="policy"
            alternatives={[
              "Explain how rate limiting defends against this",
              "Review my own service for the same weakness",
            ]}
            onPick={noop}
          />
        </State>
        <State label="no alternatives">
          <GuardrailNotice
            title="This file is excluded"
            explanation="The workspace settings exclude .env files from the assistant's context."
            policy="workspace policy"
            alternatives={[]}
          />
        </State>
      </States>
    ),
  },
]);
