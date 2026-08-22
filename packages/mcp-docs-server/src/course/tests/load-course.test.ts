import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CourseLoadError,
  loadCourseOverview,
  loadCourseStep,
  loadCourseStepFromDirectory,
  validateCourseRegistry,
} from "../load-course.js";

const tempDirectories: string[] = [];

function fixture(registry: unknown, files: Record<string, string> = {}) {
  const directory = mkdtempSync(join(tmpdir(), "mcp-course-"));
  tempDirectories.push(directory);
  writeFileSync(join(directory, "course.json"), JSON.stringify(registry));
  for (const [path, content] of Object.entries(files)) {
    const destination = join(directory, path);
    mkdirSync(join(destination, ".."), { recursive: true });
    writeFileSync(destination, content);
  }
  return directory;
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("course loader", () => {
  it("loads the fixed eight-step overview and a complete lesson", () => {
    expect(loadCourseOverview().steps).toHaveLength(8);
    const step = loadCourseStep(1);
    expect(step.id).toBe("meet-the-project");
    expect(step.lessonMarkdown).toContain("npx create-next-app@latest");
    expect(step.lessonPath.split(/[\\/]+/).join("/")).toContain(
      "course/build-generative-ui-assistant/lessons/",
    );
  });

  it("rejects invalid steps", () => {
    expect(() => loadCourseStep(9)).toThrow(CourseLoadError);
  });

  it("rejects missing, duplicate, or unordered step numbers", () => {
    const steps = Array.from({ length: 8 }, (_, index) => ({
      step: index + 1,
      id: `step-${index + 1}`,
      title: "Title",
      lessonFile: `lessons/${index + 1}.md`,
      focusFiles: [],
      docsHints: [],
      examplesHints: [],
    }));
    steps[1]!.step = 1;
    expect(() =>
      validateCourseRegistry({
        id: "build-generative-ui-assistant",
        title: "Course",
        outcome: "Outcome",
        steps,
      }),
    ).toThrow(CourseLoadError);
  });

  it("rejects unsafe lesson paths", () => {
    const directory = fixture({
      id: "build-generative-ui-assistant",
      title: "Course",
      outcome: "Outcome",
      steps: Array.from({ length: 8 }, (_, index) => ({
        step: index + 1,
        id: `step-${index + 1}`,
        title: "Title",
        lessonFile: index === 0 ? "../secret.md" : `lessons/${index + 1}.md`,
        focusFiles: [],
        docsHints: [],
        examplesHints: [],
      })),
    });
    expect(() => loadCourseStepFromDirectory(directory, 1)).toThrow(
      CourseLoadError,
    );
  });

  it("rejects a missing lesson file", () => {
    const steps = Array.from({ length: 8 }, (_, index) => ({
      step: index + 1,
      id: `step-${index + 1}`,
      title: "Title",
      lessonFile: `lessons/${index + 1}.md`,
      focusFiles: [],
      docsHints: [],
      examplesHints: [],
    }));
    const directory = fixture({
      id: "build-generative-ui-assistant",
      title: "Course",
      outcome: "Outcome",
      steps,
    });
    expect(() => loadCourseStepFromDirectory(directory, 1)).toThrow(
      "Course lesson file is missing",
    );
  });
});
