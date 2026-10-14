import { registerDefaultGenerativeUILibrary } from "../../defaultGenerativeUIComponents";
import type { GenerativeUILibrary } from "../../types";
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

/** The generative UI vocabulary as React Native components: the same definitions, events, and payloads as the web vocabulary, drawn with React Native's own components and default styles that follow light and dark mode. */
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
