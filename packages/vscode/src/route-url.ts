import { VSCODE_VIRTUAL_ORIGIN } from "./protocol";

/** Routes are served on the virtual origin, so an `http:` or `https:` URL on any other origin reaches none of them. */
export const isForeignHttpUrl = (url: URL) =>
  (url.protocol === "http:" || url.protocol === "https:") &&
  url.origin !== VSCODE_VIRTUAL_ORIGIN;
