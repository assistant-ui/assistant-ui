import type { GenerativeUILibrary } from "../types";
import { alertVocabulary } from "./alert";
import { dataVocabulary } from "./data";
import { factVocabulary } from "./fact";
import { formVocabulary } from "./form";
import { interactiveVocabulary } from "./interactive";
import { layoutVocabulary } from "./layout";
import { listVocabulary } from "./list";
import { mediaVocabulary } from "./media";
import { textVocabulary } from "./text";

/**
 * The closed generative-ui vocabulary the factory ships: a fixed set of
 * intrinsic components the model may render, each a zod `properties` schema
 * plus an unstyled structural `render` (semantic HTML with a `data-aui`
 * attribute naming the component, plus `data-aui-<prop>` hooks, for the host
 * to style). Users opt in by passing it to
 * `new JSONGenerativeUI({ library: defaultGenerativeUILibrary })`, and override
 * or extend entries with their own `defineGenerativeComponents`.
 */
export const defaultGenerativeUILibrary: GenerativeUILibrary = {
  ...textVocabulary,
  ...mediaVocabulary,
  ...factVocabulary,
  ...interactiveVocabulary,
  ...formVocabulary,
  ...layoutVocabulary,
  ...listVocabulary,
  ...dataVocabulary,
  ...alertVocabulary,
};
