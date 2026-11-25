import type { Metadata } from "next";
import { SetupPage } from "@/components/library/setup-page";
import {
  AGENT_SETUP_COMMAND,
  AGENT_SETUP_PROMPT,
} from "@/lib/agent-setup-prompt";

const description =
  "Tell your coding agent to install and set up assistant-ui.";

export const metadata: Metadata = {
  title: "Setup",
  description,
};

export default function Page() {
  return (
    <SetupPage
      prompt={AGENT_SETUP_PROMPT}
      command={AGENT_SETUP_COMMAND}
      description={description}
    />
  );
}
