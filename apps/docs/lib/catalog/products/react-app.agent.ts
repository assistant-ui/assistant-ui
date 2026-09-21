import "server-only";

export const REACT_APP_AGENT_PROMPTS = new Map<string, string>([
  [
    "react-app",
    `This product settles which project everything else installs into. Do it before any other product, while planning.

Look for React projects from your working directory down: a package.json that depends on react, skipping node_modules, build output and examples the repo only vendors. Note what each one is (Next.js, Vite, React Router, TanStack Start, Expo). Then ask, listing what you found as choices:
  npx agent-checkout <url> ask --preset project --choices "<relative path>=<what it is>,<relative path>=<what it is>" --wait
Use "." for the working directory itself. Leave --choices out when you found none. A path may not contain "," or ":".

The answer is one of:
- A path you listed, or the user's own text naming another folder. Confirm it holds a React project, make it the directory every later command runs in, and post a "log" line saying which project you are using. If the user's own text does not resolve to a React project, ask again with what you found there.
- "new:<framework>". Ask for the folder name with a plain "ask" (--default my-app, --wait), then scaffold it in the working directory in a non-interactive shell:
  - new:next: \`npx assistant-ui@latest create <name> -t default\`, which starts a Next.js App Router project with assistant-ui already scaffolded; the assistant-ui product then only needs the framework and provider wiring.
  - new:vite: \`npm create vite@latest <name> -- --template react-ts\`, then add Tailwind CSS v4 with @tailwindcss/vite.
  - new:react-router: \`npx create-react-router@latest <name> --yes\`.
  - new:tanstack-start: \`npm create @tanstack/start@latest <name>\`.
  - new:expo: \`npx assistant-ui@latest create <name> --native\`, which starts an Expo project with assistant-ui already scaffolded; the rest of the setup follows /docs/react-native.md.
  Use the package manager the surrounding repo already uses. Install dependencies, then make the new folder the directory every later command runs in.

Put the project decision at the top of the plan. Never scaffold a new project without this answer, and never install into a folder the user did not pick.

Verify: the chosen folder's package.json depends on react and its dev server starts.`,
  ],
]);
