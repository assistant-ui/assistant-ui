import * as ai from "ai";

// ai@7 (provider spec v4) added the tagged `file` tool-result part together
// with `uploadFile`; ai@6 only accepts the base64 `file-data` part. `ai`
// exports no version, so the tagged shape is keyed off that export.
export const supportsTaggedFileData = "uploadFile" in ai;
