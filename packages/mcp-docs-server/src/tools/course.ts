import { z } from "zod";
import {
  COURSE_STEP_COUNT,
  CourseLoadError,
  loadCourseOverview,
  loadCourseStep,
} from "../course/load-course.js";
import { assembleTeachingWrapper } from "../course/teaching-wrapper.js";
import { formatMCPResponse } from "../utils/mcp-format.js";
import { logger } from "../utils/logger.js";

export const courseInputSchema = z
  .object({
    step: z
      .number()
      .int()
      .min(1)
      .max(COURSE_STEP_COUNT)
      .optional()
      .describe(
        `Lesson step number from 1 to ${COURSE_STEP_COUNT}. Omit for the course overview.`,
      ),
  })
  .strict();

export const COURSE_TOOL_DESCRIPTION = `Teach the assistant-ui course "Build a Generative UI Assistant".

Call with no arguments for the course overview and lesson list.
Call with { "step": N } (1-8) to load lesson N.

The response includes the full lesson markdown (instructions + code to write),
the absolute path to that lesson file, focus files, and docs/example hints.
Follow the lesson: explain briefly, then edit the learner's project.
Use assistantUIDocs / assistantUIExamples when the lesson points to them.
After finishing a lesson, ask if they want the next step and call again with step+1.
On the final lesson, ask for their name and call assistantUICourseCertificate.`;

export const courseTool = {
  name: "assistantUICourse",
  description: COURSE_TOOL_DESCRIPTION,
  /** Full Zod object (strict) so MCP input validation rejects unknown keys like courseId. */
  parameters: courseInputSchema,
  execute: async (args: unknown = {}) => {
    const parsed = courseInputSchema.safeParse(args ?? {});
    if (!parsed.success) {
      return formatMCPResponse({
        error: "Failed to load course",
        message: parsed.error.message,
      });
    }

    try {
      if (parsed.data.step === undefined) {
        const overview = loadCourseOverview();
        logger.info("Loaded course overview");
        return formatMCPResponse({
          ...overview,
          hint: 'Call assistantUICourse with { "step": 1 } to begin the first lesson.',
        });
      }

      const step = loadCourseStep(parsed.data.step);
      logger.info(`Loaded course step ${parsed.data.step}`);
      return formatMCPResponse({
        teachingWrapper: assembleTeachingWrapper(step.lessonMarkdown),
        courseTitle: step.courseTitle,
        step: step.step,
        id: step.id,
        stepTitle: step.stepTitle,
        lessonMarkdown: step.lessonMarkdown,
        lessonPath: step.lessonPath,
        focusFiles: step.focusFiles,
        docsHints: step.docsHints,
        examplesHints: step.examplesHints,
      });
    } catch (error) {
      const message =
        error instanceof CourseLoadError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      logger.error("Failed to load course", error);
      return formatMCPResponse({
        error: "Failed to load course",
        message,
      });
    }
  },
};
