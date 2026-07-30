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
export const LEARN_SUGGESTION_HREF = "/learn?start=1&source=suggestion";

export function parseLearnAutoStartSource(
  value: unknown,
): LearnAutoStartSource {
  return value === "spotlight" ? "spotlight" : "suggestion";
}
