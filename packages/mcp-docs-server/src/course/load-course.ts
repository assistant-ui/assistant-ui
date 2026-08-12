import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import { PACKAGE_DIR } from "../constants.js";

const COURSE_ID = "build-generative-ui-assistant";
export const COURSE_STEP_COUNT = 8;
export const COURSE_DIR = join(PACKAGE_DIR, "course", COURSE_ID);

const courseStepSchema = z
  .object({
    step: z.number().int().positive(),
    id: z.string().min(1),
    title: z.string().min(1),
    lessonFile: z.string().min(1),
    focusFiles: z.array(z.string()),
    docsHints: z.array(z.string()),
    examplesHints: z.array(z.string()),
  })
  .strict();

export const courseRegistrySchema = z
  .object({
    id: z.literal(COURSE_ID),
    title: z.string().min(1),
    outcome: z.string().min(1),
    steps: z.array(courseStepSchema).length(COURSE_STEP_COUNT),
  })
  .strict();

type CourseRegistry = z.infer<typeof courseRegistrySchema>;
type CourseStep = CourseRegistry["steps"][number];

export class CourseLoadError extends Error {
  override name = "CourseLoadError";
}

function assertSafeRelativePath(path: string): void {
  if (isAbsolute(path) || path.split(/[\\/]+/).includes("..")) {
    throw new CourseLoadError("Course lessonFile must be a safe relative path");
  }
}

export function validateCourseRegistry(input: unknown): CourseRegistry {
  const result = courseRegistrySchema.safeParse(input);
  if (!result.success) {
    throw new CourseLoadError(
      `Invalid course registry: ${result.error.message}`,
    );
  }

  result.data.steps.forEach((step, index) => {
    if (step.step !== index + 1) {
      throw new CourseLoadError(
        `Course steps must be ordered exactly from 1 to ${COURSE_STEP_COUNT}`,
      );
    }
    assertSafeRelativePath(step.lessonFile);
  });

  return result.data;
}

function loadRegistry(courseDir: string): CourseRegistry {
  const registryPath = join(courseDir, "course.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(registryPath, "utf-8"));
  } catch (error) {
    throw new CourseLoadError(
      `Unable to read course registry: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return validateCourseRegistry(raw);
}

function lessonPath(courseDir: string, step: CourseStep): string {
  const candidate = resolve(courseDir, step.lessonFile);
  const relativePath = relative(courseDir, candidate);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new CourseLoadError("Course lessonFile escapes the course directory");
  }
  if (!existsSync(candidate)) {
    throw new CourseLoadError(
      `Course lesson file is missing: ${step.lessonFile}`,
    );
  }
  const resolvedCourseDir = realpathSync(courseDir);
  const resolvedLesson = realpathSync(candidate);
  const resolvedRelative = relative(resolvedCourseDir, resolvedLesson);
  if (resolvedRelative.startsWith("..") || isAbsolute(resolvedRelative)) {
    throw new CourseLoadError("Course lessonFile escapes the course directory");
  }
  return resolvedLesson;
}

export function loadCourseOverviewFromDirectory(courseDir: string) {
  const registry = loadRegistry(courseDir);
  return {
    courseTitle: registry.title,
    outcome: registry.outcome,
    steps: registry.steps.map(({ step, id, title }) => ({ step, id, title })),
  };
}

export function loadCourseStepFromDirectory(
  courseDir: string,
  stepNumber: number,
) {
  const registry = loadRegistry(courseDir);
  const step = registry.steps.find((item) => item.step === stepNumber);
  if (!step) {
    throw new CourseLoadError(
      `Course step must be a number from 1 to ${COURSE_STEP_COUNT}`,
    );
  }
  const path = lessonPath(courseDir, step);
  return {
    courseTitle: registry.title,
    step: step.step,
    id: step.id,
    stepTitle: step.title,
    lessonMarkdown: readFileSync(path, "utf-8"),
    lessonPath: path,
    focusFiles: step.focusFiles,
    docsHints: step.docsHints,
    examplesHints: step.examplesHints,
  };
}

export function loadCourseOverview() {
  return loadCourseOverviewFromDirectory(COURSE_DIR);
}

export function loadCourseStep(step: number) {
  return loadCourseStepFromDirectory(COURSE_DIR, step);
}

export function getCourseTitle() {
  return loadCourseOverview().courseTitle;
}
