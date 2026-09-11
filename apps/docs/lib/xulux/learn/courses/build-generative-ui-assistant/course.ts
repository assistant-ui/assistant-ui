import type { LearnCourseDefinition } from "../../types";

const COURSE_ROOT =
  "apps/docs/lib/xulux/learn/courses/build-generative-ui-assistant";
const SHARED_PROJECT_ROOT = `${COURSE_ROOT}/shared/project`;

const SHARED_PROJECT_FILES = {
  ".env.example": `${SHARED_PROJECT_ROOT}/.env.example`,
  "README.md": `${SHARED_PROJECT_ROOT}/README.md`,
  "package.json": `${SHARED_PROJECT_ROOT}/package.json`,
  "postcss.config.mjs": `${SHARED_PROJECT_ROOT}/postcss.config.mjs`,
  "tsconfig.json": `${SHARED_PROJECT_ROOT}/tsconfig.json`,
};

const NEXT_CONFIG_NO_TOOLS = {
  "next.config.ts": `${SHARED_PROJECT_ROOT}/next.config.no-tools.ts`,
};

const NEXT_CONFIG_WITH_TOOLS = {
  "next.config.ts": `${SHARED_PROJECT_ROOT}/next.config.tools.ts`,
};

export const buildGenerativeUiAssistantCourse = {
  id: "build-generative-ui-assistant",
  title: "Build a Generative UI Assistant",
  outcome:
    "Build a complete assistant and understand how its chat surface, runtime, tools, generative UI, shared state, persisted conversations, and branches work together.",
  sharedFiles: SHARED_PROJECT_FILES,
  steps: [
    {
      id: "meet-the-project",
      title: "Meet the project",
      lessonPath: `${COURSE_ROOT}/lessons/01-meet-the-project.md`,
      stageId: "S0",
      focusFiles: ["app/page.tsx"],
    },
    {
      id: "connect-first-assistant",
      title: "Connect your first assistant",
      lessonPath: `${COURSE_ROOT}/lessons/02-connect-your-first-assistant.md`,
      stageId: "S1",
      focusFiles: [
        "app/page.tsx",
        "app/layout.tsx",
        "components/runtime-provider.tsx",
        "components/assistant-ui/elements/thread.aui.tsx",
        "app/api/chat/route.ts",
      ],
    },
    {
      id: "guide-first-message",
      title: "Guide the first message",
      lessonPath: `${COURSE_ROOT}/lessons/03-guide-the-first-message.md`,
      stageId: "S2",
      focusFiles: ["components/assistant-ui/elements/thread.aui.tsx"],
    },
    {
      id: "add-weather-tool",
      title: "Add weather tools",
      lessonPath: `${COURSE_ROOT}/lessons/04-add-a-weather-tool.md`,
      stageId: "S3",
      focusFiles: [
        "app/toolkit.tsx",
        "app/api/chat/route.ts",
        "next.config.ts",
        "components/assistant-ui/elements/tool-fallback.aui.tsx",
        "components/assistant-ui/elements/thread.aui.tsx",
      ],
    },
    {
      id: "render-weather-ui",
      title: "Render weather as application UI",
      lessonPath: `${COURSE_ROOT}/lessons/05-render-weather-ui.md`,
      stageId: "S4",
      focusFiles: [
        "app/page.tsx",
        "app/toolkit.tsx",
        "components/tools/weather-card.tsx",
        "components/tool-provider.tsx",
        "components/assistant-ui/elements/thread.aui.tsx",
      ],
    },
    {
      id: "share-editable-notepad",
      title: "Share an editable notepad",
      lessonPath: `${COURSE_ROOT}/lessons/06-share-an-editable-notepad.md`,
      stageId: "S5",
      focusFiles: [
        "app/toolkit.tsx",
        "components/tools/notepad.tsx",
        "components/runtime-provider.tsx",
        "app/api/chat/route.ts",
      ],
    },
    {
      id: "persist-conversations",
      title: "Add conversations that persist",
      lessonPath: `${COURSE_ROOT}/lessons/07-persist-conversations.md`,
      stageId: "S6",
      focusFiles: [
        "app/page.tsx",
        "components/assistant-shell.tsx",
        "components/assistant-ui/elements/thread-list.tsx",
        "components/runtime-provider.tsx",
        "lib/browser-thread-list-adapter.tsx",
      ],
    },
    {
      id: "revise-and-branch",
      title: "Revise and branch a conversation",
      lessonPath: `${COURSE_ROOT}/lessons/08-revise-and-branch.md`,
      stageId: "S7",
      focusFiles: ["components/assistant-ui/elements/thread.aui.tsx"],
    },
  ],
  stages: {
    S0: {
      id: "S0",
      previewPath: "/learn/preview/S0",
      sourceRoot: `${COURSE_ROOT}/stages/S0/project`,
      sharedFiles: NEXT_CONFIG_NO_TOOLS,
    },
    S1: {
      id: "S1",
      previewPath: "/learn/preview/S1",
      sourceRoot: `${COURSE_ROOT}/stages/S1/project`,
      previousStageId: "S0",
      sharedFiles: NEXT_CONFIG_NO_TOOLS,
    },
    S2: {
      id: "S2",
      previewPath: "/learn/preview/S2",
      sourceRoot: `${COURSE_ROOT}/stages/S2/project`,
      previousStageId: "S1",
      sharedFiles: NEXT_CONFIG_NO_TOOLS,
    },
    S3: {
      id: "S3",
      previewPath: "/learn/preview/S3",
      sourceRoot: `${COURSE_ROOT}/stages/S3/project`,
      previousStageId: "S2",
      sharedFiles: NEXT_CONFIG_WITH_TOOLS,
    },
    S4: {
      id: "S4",
      previewPath: "/learn/preview/S4",
      sourceRoot: `${COURSE_ROOT}/stages/S4/project`,
      previousStageId: "S3",
      sharedFiles: NEXT_CONFIG_WITH_TOOLS,
    },
    S5: {
      id: "S5",
      previewPath: "/learn/preview/S5",
      sourceRoot: `${COURSE_ROOT}/stages/S5/project`,
      previousStageId: "S4",
      sharedFiles: NEXT_CONFIG_WITH_TOOLS,
    },
    S6: {
      id: "S6",
      previewPath: "/learn/preview/S6",
      sourceRoot: `${COURSE_ROOT}/stages/S6/project`,
      previousStageId: "S5",
      sharedFiles: NEXT_CONFIG_WITH_TOOLS,
    },
    S7: {
      id: "S7",
      previewPath: "/learn/preview/S7",
      sourceRoot: `${COURSE_ROOT}/stages/S7/project`,
      previousStageId: "S6",
      sharedFiles: NEXT_CONFIG_WITH_TOOLS,
    },
  },
} satisfies LearnCourseDefinition;
