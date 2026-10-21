import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ElicitationForm } from "@assistant-ui/ui/components/assistant-ui/elements/elicitation-form.tsx";
import { OptionList } from "@assistant-ui/ui/components/assistant-ui/elements/option-list.tsx";
import { PermissionGrant } from "@assistant-ui/ui/components/assistant-ui/elements/permission-grant.tsx";
import { QuestionFlow } from "@assistant-ui/ui/components/assistant-ui/elements/question-flow.tsx";
import {
  ASK_QUESTIONS_TOOL,
  CHOOSE_OPTION_TOOL,
  REQUEST_INPUT_TOOL,
  REQUEST_PERMISSION_TOOL,
  type AskQuestionsArgs,
  type AskQuestionsResult,
  type ChooseOptionArgs,
  type ChooseOptionResult,
  type RequestInputArgs,
  type RequestInputResult,
  type RequestPermissionArgs,
  type RequestPermissionResult,
} from "../../src/fixtures/rich/agent-input";
import { defineFixtureUI } from "../define-fixture-ui";

const CARD = "my-2";

const AskQuestions: ToolCallMessagePartComponent<
  AskQuestionsArgs,
  AskQuestionsResult
> = ({ args, result, status, addResult }) => {
  const steps = args.steps ?? [];
  if (status.type === "running" || steps.length === 0) return null;
  return (
    <QuestionFlow
      className={CARD}
      steps={steps}
      choice={result}
      onComplete={(answers) => addResult(answers)}
    />
  );
};

const RequestInput: ToolCallMessagePartComponent<
  RequestInputArgs,
  RequestInputResult
> = ({ args, result, status, addResult }) => {
  if (status.type === "running" || !args.fields) return null;
  return (
    <ElicitationForm
      className={CARD}
      server={args.server}
      message={args.message}
      fields={args.fields}
      state={
        result === undefined
          ? "request"
          : result.action === "accept"
            ? "accepted"
            : "declined"
      }
      onAccept={() => addResult({ action: "accept" })}
      onDecline={() => addResult({ action: "decline" })}
    />
  );
};

const RequestPermission: ToolCallMessagePartComponent<
  RequestPermissionArgs,
  RequestPermissionResult
> = ({ args, result, status, addResult }) => {
  if (status.type === "running" || !args.reach) return null;
  return (
    <PermissionGrant
      className={CARD}
      capability={args.capability}
      requester={args.requester}
      reach={args.reach}
      scope={result?.scope ?? "pending"}
      onGrant={(scope) => addResult({ scope })}
    />
  );
};

const ChooseOption: ToolCallMessagePartComponent<
  ChooseOptionArgs,
  ChooseOptionResult
> = ({ args, result, status, addResult }) => {
  if (status.type === "running" || !args.options) return null;
  return (
    <OptionList
      className={CARD}
      aria-label={args.question}
      options={args.options}
      selectionMode={args.selectionMode}
      choice={result?.ids}
      onConfirm={(ids) => addResult({ ids })}
    />
  );
};

const schema = (properties: Record<string, { type: "array" | "string" }>) => ({
  type: "object" as const,
  properties,
});

export default defineFixtureUI({
  tools: {
    [ASK_QUESTIONS_TOOL]: {
      type: "human",
      description: "Ask the user a short series of multiple-choice questions.",
      parameters: schema({ steps: { type: "array" } }),
      render: AskQuestions,
    },
    [REQUEST_INPUT_TOOL]: {
      type: "human",
      description: "Ask the user to confirm the inputs an MCP server needs.",
      parameters: schema({
        server: { type: "string" },
        message: { type: "string" },
        fields: { type: "array" },
      }),
      render: RequestInput,
    },
    [REQUEST_PERMISSION_TOOL]: {
      type: "human",
      description: "Ask the user to grant a capability.",
      parameters: schema({
        capability: { type: "string" },
        requester: { type: "string" },
        reach: { type: "array" },
      }),
      render: RequestPermission,
    },
    [CHOOSE_OPTION_TOOL]: {
      type: "human",
      description: "Ask the user to pick from a list of options.",
      parameters: schema({
        question: { type: "string" },
        selectionMode: { type: "string" },
        options: { type: "array" },
      }),
      render: ChooseOption,
    },
  },
});
