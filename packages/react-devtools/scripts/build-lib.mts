import { Build } from "@assistant-ui/x-buildutils";

// Build only the React component library
await Build.start().transpileTypescript();
