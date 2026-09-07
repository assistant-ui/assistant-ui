import { customAlphabet } from "nanoid/non-secure";

/**
 * @deprecated Experimental since 2024-05-31, extended 2026-12-05. Not scheduled for removal; the API may change in any release.
 */
export const generateId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
);

const errorPrefix = "__error__";
export const generateErrorMessageId = () => `${errorPrefix}${generateId()}`;
export const isErrorMessageId = (id: string) => id.startsWith(errorPrefix);
