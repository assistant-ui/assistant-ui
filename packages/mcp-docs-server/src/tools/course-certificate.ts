import { z } from "zod";
import { getCourseTitle } from "../course/load-course.js";
import {
  CertificateError,
  MAX_CERTIFICATE_NAME_LENGTH,
  writeCourseCertificate,
} from "../course/certificate.js";
import { formatMCPResponse } from "../utils/mcp-format.js";
import { logger } from "../utils/logger.js";

export const certificateInputSchema = z
  .object({
    name: z
      .string()
      .describe(
        `Recipient name to print on the certificate (required, max ${MAX_CERTIFICATE_NAME_LENGTH} characters).`,
      ),
  })
  .strict();

export const COURSE_CERTIFICATE_TOOL_DESCRIPTION = `Generate a local PNG completion certificate for the assistant-ui course.

Ask the user what name to put on the certificate, then call with { "name": "..." }.
Returns the absolute path to the saved PNG. Use after the final course lesson.`;

/** Test/CI override for the certificates directory (must stay outside the tool input schema). */
export const CERTIFICATES_DIR_ENV = "ASSISTANT_UI_COURSE_CERTIFICATES_DIR";

export const courseCertificateTool = {
  name: "assistantUICourseCertificate",
  description: COURSE_CERTIFICATE_TOOL_DESCRIPTION,
  /** Full Zod object (strict) so MCP input validation rejects unknown keys like courseId. */
  parameters: certificateInputSchema,
  execute: async (args: unknown) => {
    const parsed = certificateInputSchema.safeParse(args ?? {});
    if (!parsed.success) {
      return formatMCPResponse({
        error: "Failed to write course certificate",
        message: parsed.error.message,
      });
    }

    try {
      const overrideDir = process.env[CERTIFICATES_DIR_ENV]?.trim();
      const result = writeCourseCertificate({
        name: parsed.data.name,
        courseTitle: getCourseTitle(),
        ...(overrideDir ? { certificatesDir: overrideDir } : {}),
      });
      logger.info(`Wrote course certificate ${result.certificateId}`);
      return formatMCPResponse(result);
    } catch (error) {
      const message =
        error instanceof CertificateError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      logger.error("Failed to write course certificate", error);
      return formatMCPResponse({
        error: "Failed to write course certificate",
        message,
      });
    }
  },
};
