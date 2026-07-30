export type LearnCourseStartSource =
  | "chat"
  | "curriculum"
  | "suggestion"
  | "spotlight";

export type LearnAutoStartSource = Extract<
  LearnCourseStartSource,
  "suggestion" | "spotlight"
>;

export const LEARN_SPOTLIGHT_HREF = "/learn?start=1&source=spotlight";

export function parseLearnAutoStartSource(
  value: unknown,
): LearnAutoStartSource {
  return value === "spotlight" ? "spotlight" : "suggestion";
}
