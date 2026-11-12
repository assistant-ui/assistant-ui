import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AGENT_SETUP_PROMPT } from "@/lib/agent-setup-prompt";
import { AgentSetupPromptLLM, QuickstartLLM } from "./llm";

const decode = (html: string) =>
  html.replaceAll("&quot;", '"').replaceAll("&#x27;", "'");

describe("landing markdown components", () => {
  it("renders the installation prompt and the agent hint as text", () => {
    const html = decode(renderToStaticMarkup(<AgentSetupPromptLLM />));
    expect(html).toContain(`<pre>${AGENT_SETUP_PROMPT}</pre>`);
    expect(html).toContain("<code>npx assistant-ui@latest setup</code>");
    expect(html).toContain(
      "<code>npx -y --prefer-online assistant-ui@latest setup</code>",
    );
    expect(html).not.toContain("`");
  });

  it("points the React quickstart at the manual installation page", () => {
    const html = decode(renderToStaticMarkup(QuickstartLLM({})));
    expect(html).toContain(AGENT_SETUP_PROMPT);
    expect(html).toContain(
      "<code>npx -y --prefer-online assistant-ui@latest setup</code>",
    );
    expect(html).toContain('href="/docs/manual-installation"');
  });
});
