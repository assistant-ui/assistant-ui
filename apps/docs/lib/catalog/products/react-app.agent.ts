import "server-only";

export const REACT_APP_AGENT_PROMPTS = new Map<string, string>([
  [
    "react-app",
    `Establish the target directory before planning installation. Inspect the working directory and the surrounding workspace for the app the user is working on. Use that app when the context identifies it. If the target is unclear, ask a plain question for its path, naming the folders you found and what they contain. Do not present a new versus existing app setting or invoke the project preset.

Read the target's package.json and source to detect its framework and package manager. If the target is empty, explain the required scaffolding in the plan and ask only for decisions the project does not answer. Never scaffold or install before plan approval, and never choose an unrelated folder on the user's behalf.

For approved scaffolding, use the detected or approved framework and the package manager already present in the surrounding workspace:
- Next.js: \`npx assistant-ui@latest create <name> -t default\`, which includes assistant-ui scaffolding.
- Vite: \`npm create vite@latest <name> -- --template react-ts\`, then add Tailwind CSS v4 with @tailwindcss/vite.
- React Router: \`npx create-react-router@latest <name> --yes\`.
- TanStack Start: \`npm create @tanstack/start@latest <name>\`.
- Expo: \`npx assistant-ui@latest create <name> --native\`, then follow /docs/react-native.md.
Run a scaffolder from the approved folder's parent with the folder's name as <name>, so the app lands in the approved folder rather than a nested one. Install dependencies in the approved folder and run later commands there.

Verify: the target's package.json depends on React and its dev server starts.`,
  ],
]);
