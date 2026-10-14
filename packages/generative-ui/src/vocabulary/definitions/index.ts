import { alertDefinitions } from "./alert";
import { dataDefinitions } from "./data";
import { factDefinitions } from "./fact";
import { formDefinitions } from "./form";
import { iconDefinitions } from "./icon";
import { interactiveDefinitions } from "./interactive";
import { layoutDefinitions } from "./layout";
import { listDefinitions } from "./list";
import { mediaDefinitions } from "./media";
import { textDefinitions } from "./text";

export const vocabularyDefinitions = {
  ...textDefinitions,
  ...mediaDefinitions,
  ...factDefinitions,
  ...interactiveDefinitions,
  ...formDefinitions,
  ...layoutDefinitions,
  ...listDefinitions,
  ...dataDefinitions,
  ...alertDefinitions,
  ...iconDefinitions,
};
