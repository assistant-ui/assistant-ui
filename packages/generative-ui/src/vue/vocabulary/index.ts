import { registerDefaultGenerativeUILibrary } from "../../defaultGenerativeUIComponents";
import type { GenerativeUILibrary } from "../toSpecCatalog";
import { alertVocabulary } from "./alert";
import { dataVocabulary } from "./data";
import { factVocabulary } from "./fact";
import { formVocabulary } from "./form";
import { iconVocabulary } from "./icon";
import { interactiveVocabulary } from "./interactive";
import { layoutVocabulary } from "./layout";
import { listVocabulary } from "./list";
import { mediaVocabulary } from "./media";
import { textVocabulary } from "./text";

/**
 * The generative UI vocabulary as Vue components for spec mode. Each renders the same unstyled markup as the React vocabulary, semantic HTML with a `data-aui` attribute naming the component and `data-aui-<prop>` hooks, so the same styles apply.
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
  ...iconVocabulary,
};

registerDefaultGenerativeUILibrary(defaultGenerativeUILibrary);
