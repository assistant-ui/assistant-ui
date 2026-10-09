export type ShowcaseItem = {
  title: string;
  image: string;
  tag: string;
  description: string;
  link: string;
  media?: "logo";
  openSource?: boolean;
  announcementLink?: string;
  repositoryLink?: string;
};

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    title: "Claude Managed Agents",
    image: "/screenshot/claude-managed-agents.png",
    tag: "Developer Tools",
    link: "https://github.com/anthropics/claude-quickstarts/tree/main/managed-agents/assistant-ui",
    description: "Managed agent sessions rendered with assistant-ui.",
    openSource: true,
  },
  {
    title: "Chat LangChain",
    image: "/screenshot/chat-langchain.png",
    tag: "Developer Tools",
    link: "https://chat.langchain.com/",
    repositoryLink: "https://github.com/langchain-ai/chat-langchain",
    description: "AI-powered guide to the LangChain ecosystem.",
    openSource: true,
  },
  {
    title: "Inconvo",
    image: "/screenshot/inconvo.png",
    tag: "Developer Tools",
    link: "https://inconvo.com/",
    repositoryLink: "https://github.com/ten-dev/inconvo-assistant-ui-example",
    description: "Build AI agents that answer questions from your databases.",
  },
  {
    title: "Helicone",
    image: "/screenshot/helicone.png",
    tag: "Developer Tools",
    link: "https://www.helicone.ai/",
    repositoryLink: "https://github.com/helicone/helicone",
    description: "Open-source LLM observability and gateway platform.",
    openSource: true,
  },
  {
    title: "Hermes Agent",
    image: "/icons/cust/hermes.png",
    media: "logo",
    tag: "AI Assistant",
    link: "https://hermes-agent.nousresearch.com",
    repositoryLink: "https://github.com/NousResearch/hermes-agent",
    description:
      "The self-improving agent from Nous Research. Desktop UI built with assistant-ui.",
    openSource: true,
  },
  {
    title: "Closing.wtf",
    image: "/screenshot/closing-wtf.png",
    tag: "AI Assistant",
    link: "https://closing.wtf/",
    announcementLink:
      "https://closing.wtf/blog/mortgage-analysis-chat-with-assistantui",
    description: "AI mortgage analysis that saves homebuyers thousands.",
  },
  {
    title: "Open Canvas",
    image: "/screenshot/open-canvas.png",
    tag: "AI Assistant",
    link: "https://opencanvas.langchain.com/",
    repositoryLink: "https://github.com/langchain-ai/open-canvas",
    description: "Open-source collaborative writing interface with AI.",
    openSource: true,
  },
  {
    title: "LangGraph Stockbroker",
    image: "/screenshot/stockbroker.png",
    tag: "Developer Tools",
    link: "https://assistant-ui-stockbroker.vercel.app/",
    announcementLink: "https://blog.langchain.dev/assistant-ui/",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui-stockbroker",
    description: "AI assistant for researching public company financials.",
    openSource: true,
  },
  {
    title: "CoreViz",
    image: "/screenshot/coreviz.png",
    tag: "AI Assistant",
    link: "https://coreviz.io/",
    description: "Search and analyze photos and videos with natural language.",
  },
];

const TAG_ORDER = ["Developer Tools", "AI Assistant"] as const;

export const SHOWCASE_COUNT = SHOWCASE_ITEMS.length;

export const SHOWCASE_SECTIONS = TAG_ORDER.map((label) => ({
  label,
  items: SHOWCASE_ITEMS.filter((item) => item.tag === label),
})).filter((section) => section.items.length > 0);
