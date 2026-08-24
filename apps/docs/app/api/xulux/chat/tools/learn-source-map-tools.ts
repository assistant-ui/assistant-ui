import { createBashTool } from "bash-tool";
import { tool, zodSchema } from "ai";
import { z } from "zod";
import { resolveStageFiles } from "@/lib/xulux/learn/stage-source";
import { getLearnCourse, getLearnStep } from "@/lib/xulux/learn/registry";
import type {
  LearnContext,
  LearnCourseStepResult,
} from "@/lib/xulux/learn/types";
import { getRepoSourceSnapshot } from "./source-map-tools";

type LearnSourceMapOptions = {
  courseId: string;
  getStageId: () => string | null;
};

const sourceScopeSchema = z.enum(["repo", "course"]);

export function createLearnSourceMapTools({
  courseId,
  getStageId,
}: LearnSourceMapOptions) {
  let repoToolkitPromise: ReturnType<typeof createBashTool> | null = null;
  const courseToolkitPromises = new Map<
    string,
    ReturnType<typeof createBashTool>
  >();

  const getToolkit = async (scope: "repo" | "course") => {
    if (scope === "repo") {
      repoToolkitPromise ??= createBashTool({
        files: getRepoSourceSnapshot(),
        destination: "/repo",
        maxFiles: 5000,
        maxOutputLength: 15000,
        promptOptions: { toolPrompt: "" },
      });
      return repoToolkitPromise;
    }

    const stageId = getStageId();
    if (!stageId) return null;
    let toolkitPromise = courseToolkitPromises.get(stageId);
    if (!toolkitPromise) {
      toolkitPromise = resolveStageFiles(courseId, stageId).then((files) =>
        createBashTool({
          files,
          destination: "/course",
          maxFiles: 500,
          maxOutputLength: 15000,
          promptOptions: { toolPrompt: "" },
        }),
      );
      courseToolkitPromises.set(stageId, toolkitPromise);
    }
    return toolkitPromise;
  };

  return {
    inspectSourceMap: tool({
      description:
        "Execute bash commands in a source mount. Use scope=course for the selected Learn stage under /course. Use scope=repo for the assistant-ui monorepo under /repo.",
      inputSchema: zodSchema(
        z.object({
          scope: sourceScopeSchema.describe(
            "Use course for the selected lesson application or repo for the assistant-ui monorepo.",
          ),
          command: z
            .string()
            .describe("The bash command to execute from the selected mount."),
        }),
      ),
      execute: async ({ scope, command }, options) => {
        const toolkit = await getToolkit(scope);
        if (!toolkit) {
          return {
            error:
              "No course source is available before a Learn step is active.",
          };
        }
        const { tools } = await toolkit;
        return tools.bash.execute!({ command }, options);
      },
    }),
    readSourceMapFile: tool({
      description:
        "Read a source file from /course for the selected Learn stage or /repo for the assistant-ui monorepo.",
      inputSchema: zodSchema(
        z.object({
          scope: sourceScopeSchema.describe(
            "Use course for the selected lesson application or repo for the assistant-ui monorepo.",
          ),
          path: z
            .string()
            .describe(
              "The path relative to the selected source mount, such as app/page.tsx.",
            ),
        }),
      ),
      execute: async ({ scope, path }, options) => {
        const toolkit = await getToolkit(scope);
        if (!toolkit) {
          return {
            error:
              "No course source is available before a Learn step is active.",
          };
        }
        const normalizedPath = normalizeLearnSourcePath(path, scope);
        if (!normalizedPath) {
          return { error: "The source path is invalid." };
        }
        const { tools } = await toolkit;
        return tools.readFile.execute!({ path: normalizedPath }, options);
      },
    }),
  };
}

export function normalizeLearnSourcePath(
  path: string,
  scope: "repo" | "course",
) {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "");
  const prefix = `${scope}/`;
  const relativePath =
    normalized === scope
      ? ""
      : normalized.startsWith(prefix)
        ? normalized.slice(prefix.length)
        : normalized;
  if (
    !relativePath ||
    relativePath.split("/").some((segment) => segment === "..")
  ) {
    return null;
  }
  return relativePath;
}

export function resolveLearnSourceStageId(context: LearnContext) {
  if (!context.currentStepId) return null;

  const course = getLearnCourse(context.courseId);
  const currentIndex = course.steps.findIndex(
    ({ id }) => id === context.currentStepId,
  );
  const selectedIndex = context.selectedStepId
    ? course.steps.findIndex(({ id }) => id === context.selectedStepId)
    : -1;
  const stepId =
    context.selectedStepId &&
    selectedIndex >= 0 &&
    selectedIndex <= currentIndex
      ? context.selectedStepId
      : context.currentStepId;

  return getLearnStep(context.courseId, stepId).stageId;
}

export function createLearnSourceSelection(context: LearnContext) {
  let stageId = resolveLearnSourceStageId(context);

  return {
    getStageId: () => stageId,
    acceptCourseResult: (result: LearnCourseStepResult) => {
      stageId = "finalStage" in result ? result.finalStage.id : result.stage.id;
    },
  };
}
