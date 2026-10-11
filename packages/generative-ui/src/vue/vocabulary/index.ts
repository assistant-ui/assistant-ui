import { registerDefaultGenerativeUILibrary } from "../../defaultGenerativeUIComponents";
import type { GenerativeUILibrary } from "../toSpecCatalog";
import { textVocabulary } from "./text";

/**
 * The generative UI vocabulary as Vue components for spec mode. Each renders the same unstyled markup as the React vocabulary, semantic HTML with a `data-aui` attribute naming the component and `data-aui-<prop>` hooks, so the same styles apply.
 */
export const defaultGenerativeUILibrary: GenerativeUILibrary = {
  ...textVocabulary,
};

registerDefaultGenerativeUILibrary(defaultGenerativeUILibrary);
