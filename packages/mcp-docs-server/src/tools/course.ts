import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { COURSE_PATH } from "../constants.js";
import { formatMCPResponse } from "../utils/mcp-format.js";

const courseManifestPath = join(COURSE_PATH, "course.json");

const courseInputSchema = z.object({
  step: z.number().int().min(1).max(8).optional(),
});

const teachingWrapper = [
  "You are teaching this course inside the learner's real project.",
  "Implement each lesson from scratch in that workspace; do not copy a hidden stage or use an assistant-ui starter that pre-solves the lesson.",
  "Before editing, inspect the current files and explain the relevant boundary in plain language.",
  "After editing, show the important diff, run the project's applicable checks, and report the observed result before continuing.",
  "Keep the learner at the checkpoint in the lesson and do not claim a browser or model result that was not verified.",
].join("\n");

type CourseStep = {
  step: number;
  id: string;
  title: string;
  lessonFile: string;
  focusFiles: string[];
  docsHints: string[];
  examplesHints: string[];
};

type CourseManifest = {
  id: string;
  title: string;
  outcome: string;
  steps: CourseStep[];
};

async function loadCourse(): Promise<CourseManifest> {
  return JSON.parse(
    await readFile(courseManifestPath, "utf8"),
  ) as CourseManifest;
}

export const assistantUICourseTools = {
  name: "assistantUICourse",
  description:
    "Teach the eight-step Build a Generative UI Assistant course. Call without arguments for the overview, or provide step 1 through 8 for the full lesson markdown and implementation guidance.",
  parameters: courseInputSchema,
  execute: async ({ step }: z.infer<typeof courseInputSchema>) => {
    const course = await loadCourse();
    if (step === undefined) {
      return formatMCPResponse({
        type: "course",
        course: {
          id: course.id,
          title: course.title,
          outcome: course.outcome,
        },
        totalSteps: course.steps.length,
        steps: course.steps.map(
          ({ lessonFile: _lessonFile, ...summary }) => summary,
        ),
        teachingWrapper,
      });
    }

    const lesson = course.steps[step - 1];
    if (!lesson) {
      return formatMCPResponse({
        error: `Course step must be between 1 and ${course.steps.length}`,
      });
    }

    const markdown = await readFile(
      join(COURSE_PATH, lesson.lessonFile),
      "utf8",
    );
    return formatMCPResponse({
      type: "lesson",
      course: {
        id: course.id,
        title: course.title,
        outcome: course.outcome,
      },
      step: lesson.step,
      id: lesson.id,
      title: lesson.title,
      lesson: markdown,
      focusFiles: lesson.focusFiles,
      docsHints: lesson.docsHints,
      examplesHints: lesson.examplesHints,
      teachingWrapper,
    });
  },
};
