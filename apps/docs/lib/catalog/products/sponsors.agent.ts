import "server-only";
import { ASSISTANT_UI_AGENT_PROMPTS } from "./assistant-ui.agent";

const ground = (docs: string) =>
  `Read ${docs} before writing code and follow its current install path; never invent package names, versions, or APIs it does not show. Use the project's package manager, detected from its lockfile.`;

const secrets = (variable: string) =>
  `Ask the user for their ${variable}; never invent one. In a setup session use the wizard's secret input. Store it in the project's existing env file (for example .env.local), keep it server-side, and make sure that file is gitignored.`;

const buildBrief = `Fit the integration to what the user said they are building in their setup instructions. If there is no brief, ask what they want this product to do before wiring it in.`;

export const SPONSOR_AGENT_PROMPTS = new Map<string, string>([
  ["sponsors/assistant-ui", ASSISTANT_UI_AGENT_PROMPTS.get("assistant-ui")!],
  [
    "sponsors/mastra",
    `${ground("https://mastra.ai/docs")} ${buildBrief}

1. If the project already has an agent backend, ask before replacing it. Otherwise add Mastra to the existing project as the docs describe; do not scaffold a second app beside it.
2. Define the agent with the model provider the project already uses. ${secrets("model provider API key")}
3. If assistant-ui is installed, connect its chat route to the Mastra agent so the thread streams its replies, following https://www.assistant-ui.com/docs/integrations/frameworks/mastra/full-stack.md.

Verify: send a message from the app and confirm the Mastra agent answers.`,
  ],
  [
    "sponsors/neon",
    `${ground("https://neon.com/docs")} ${buildBrief}

1. ${secrets("Neon connection string (DATABASE_URL)")} Never create a Neon project or branch for them without asking.
2. Install the Neon serverless driver, or reuse the ORM the project already has, and add a small database module that reads DATABASE_URL.
3. Create only the tables the user's brief needs, through the project's migration tool if it has one.

Verify: run a query that writes and reads a row, and report the result.`,
  ],
  [
    "sponsors/exa",
    `${ground("https://exa.ai/docs")} ${buildBrief}

1. ${secrets("Exa API key (EXA_API_KEY)")}
2. Install the Exa SDK and call it only from server code.
3. If the project has an agent or AI SDK chat route, expose Exa search as a tool the model can call; otherwise add a server function the app can use.

Verify: run one search for a topic from the user's brief and confirm results come back with URLs.`,
  ],
  [
    "sponsors/kernel",
    `${ground("https://www.kernel.sh/docs")} ${buildBrief}

1. ${secrets("Kernel API key (KERNEL_API_KEY)")}
2. Install the Kernel SDK and create browsers only from server code, connecting with the automation library the docs show.
3. If the project has an agent, expose the browser task as a tool it can call. Always close the browser session when the task ends.

Verify: open a browser, load a page from the user's brief, read its title, and confirm the session closes.`,
  ],
  [
    "sponsors/executor",
    `${ground("https://executor.sh/docs")} ${buildBrief}

1. Ask the user for their Executor MCP endpoint and any token it needs; never invent either. Keep the token server-side.
2. Connect the project's agent to the Executor endpoint as an MCP server, using the MCP client the agent framework already provides.
3. Ask which integrations the user wants available, and leave adding them in the Executor dashboard to the user.

Verify: list the tools the agent sees through Executor and call one harmless read-only tool.`,
  ],
  [
    "sponsors/fly",
    `${ground("https://fly.io/docs")} ${buildBrief}

1. Check that flyctl is installed and authenticated (\`fly auth whoami\`). If it is not, tell the user to run \`fly auth login\` themselves; never ask for their token.
2. Run \`fly launch --no-deploy\` so Fly detects the framework and writes fly.toml and a Dockerfile; review them against the project's build and start commands.
3. Set every server secret the app needs with \`fly secrets set\`; never commit them.
4. Ask before deploying. Only run \`fly deploy\` once the user confirms the app name and organization.

Verify: after an approved deploy, open the app's URL and confirm it serves. Otherwise report the command left to run.`,
  ],
  [
    "sponsors/agentmail",
    `${ground("https://docs.agentmail.to")} ${buildBrief}

1. ${secrets("AgentMail API key (AGENTMAIL_API_KEY)")}
2. Install the AgentMail SDK and call it only from server code.
3. Create an inbox for the agent and expose sending and reading mail as tools the agent can call. Ask before sending mail to any address other than the user's own.

Verify: create an inbox, send a test message to it from the app, and confirm it arrives.`,
  ],
]);
