import { customAlphabet } from "nanoid/non-secure";

/**
 * @deprecated This API is experimental and may change without notice.
 */
export const generateId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
);

const errorPrefix = "__error__";
export const generateErrorMessageId = () => `${errorPrefix}${generateId()}`;
export const isErrorMessageId = (id: string) => id.startsWith(errorPrefix);
