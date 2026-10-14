import type { ZodType } from "zod";

/** A vocabulary component without a renderer: the description and props schema the model sees, and whether it renders while its props stream. Each framework's vocabulary adds a renderer to these. */
export type VocabularyDefinition = {
  description: string;
  properties: ZodType;
  streamProperties?: true;
};
