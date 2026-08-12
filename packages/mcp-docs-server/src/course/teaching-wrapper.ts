export const COURSE_TEACHING_PREAMBLE = `This is a course to help a new user learn assistant-ui, the open-source React library for AI chat and agent interfaces.
Help the user through this step by walking them through the content.
If the step contains instructions to write code, write that code in the user's project when possible.
Always briefly explain the step before writing code.
Allow the user to ask questions.
Return any text in markdown blockquotes exactly as written.

Here is the content for this step:`;

export const COURSE_TEACHING_EPILOGUE = `For steps 1 through 7, when this step is done, ask if the user wants to continue and call assistantUICourse with the next step number.
For step 8, ask what name to put on the user's certificate and call assistantUICourseCertificate with that name.`;

export function assembleTeachingWrapper(lessonMarkdown: string): string {
  return `${COURSE_TEACHING_PREAMBLE}\n\n${lessonMarkdown}\n\n${COURSE_TEACHING_EPILOGUE}`;
}
