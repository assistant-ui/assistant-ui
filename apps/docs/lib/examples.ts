export type ExampleItem = {
  title: string;
  description?: string;
  image: string;
  link: string;
  external?: boolean;
  githubLink?: string;
};

const INTERNAL_EXAMPLES: ExampleItem[] = [
  {
    title: "Modal",
    image: "/screenshot/examples/modal.png",
    description: "Floating button that opens an AI assistant chat box.",
    link: "/examples/modal",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/assistant-ui/assistant-modal.tsx",
  },
  {
    title: "Form Filling Co-Pilot",
    image: "/screenshot/examples/form-demo.png",
    description: "AssistantSidebar copilot which fills forms for the user.",
    link: "/examples/form-demo",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/examples/with-react-hook-form/app/page.tsx",
  },
  {
    title: "ChatGPT Clone",
    image: "/screenshot/examples/chatgpt.png",
    description: "Customized colors and styles for a ChatGPT look and feel.",
    link: "/examples/chatgpt",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/chatgpt.tsx",
  },
  {
    title: "Claude Clone",
    image: "/screenshot/examples/claude.png",
    description: "Customized colors and styles for a Claude look and feel.",
    link: "/examples/claude",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/claude.tsx",
  },
  {
    title: "Grok Clone",
    image: "/screenshot/examples/grok.png",
    description: "Customized colors and styles for a Grok look and feel.",
    link: "/examples/grok",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/grok.tsx",
  },
  {
    title: "Perplexity Clone",
    image: "/screenshot/examples/perplexity.png",
    description: "Customized colors and styles for a Perplexity look and feel.",
    link: "/examples/perplexity",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/perplexity.tsx",
  },
  {
    title: "AI SDK",
    image: "/screenshot/examples/ai-sdk.png",
    description: "Chat persistence with AI SDK.",
    link: "/examples/ai-sdk",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/shadcn.tsx",
  },
  {
    title: "Mem0 - ChatGPT with memory",
    image: "/screenshot/examples/mem0.png",
    description:
      "A personalized AI chat app powered by Mem0 that remembers your preferences, facts, and memories.",
    link: "/examples/mem0",
    githubLink:
      "https://github.com/mem0ai/mem0/blob/main/examples/mem0-demo/components/assistant-ui/thread.tsx",
  },
  {
    title: "LangGraph Stockbroker",
    image: "/screenshot/stockbroker.png",
    description: "A stockbroker showing human in the loop with LangGraph",
    link: "/examples/stockbroker",
    githubLink: "https://github.com/assistant-ui/assistant-ui-stockbroker",
  },
  {
    title: "Artifacts",
    image: "/screenshot/examples/artifacts.png",
    description:
      "Open Source Claude Artifacts. You can ask the bot to generate websites.",
    link: "/examples/artifacts",
    githubLink: "https://github.com/Yonom/assistant-ui-artifacts",
  },
  {
    title: "Expo (React Native)",
    image: "/screenshot/examples/expo.png",
    description:
      "Native iOS & Android chat app with drawer navigation and thread management.",
    link: "/examples/expo",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-expo",
  },
];

const COMMUNITY_EXAMPLES: ExampleItem[] = [
  {
    title: "Open Canvas",
    image: "/screenshot/open-canvas.png",
    description: "OSS implementation of ChatGPT's Canvas.",
    link: "https://github.com/langchain-ai/open-canvas",
    external: true,
  },
  {
    title: "FastAPI + LangGraph",
    image: "/screenshot/examples/fastapi-langgraph.png",
    description:
      "Integration of a FastAPI + LangGraph server with assistant-ui.",
    link: "https://github.com/Yonom/assistant-ui-langgraph-fastapi",
    external: true,
  },
];

export { INTERNAL_EXAMPLES, COMMUNITY_EXAMPLES };
