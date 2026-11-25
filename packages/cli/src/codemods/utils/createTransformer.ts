import type { FileInfo, API, JSCodeshift, Collection } from "jscodeshift";

export type TransformerFunction = (
  context: TransformContext,
  fileInfo: FileInfo,
  api: API,
  options: any,
) => void;

export interface TransformContext {
  /**
   * The jscodeshift API object.
   */
  j: JSCodeshift;

  /**
   * The root collection of the AST.
   */
  root: Collection<any>;

  markAsChanged: () => void;
}

export function createTransformer(transformFn: TransformerFunction) {
  return function transformer(fileInfo: FileInfo, api: API, options: any) {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);

    let isChanged = false;
    const context: TransformContext = {
      j,
      root,
      markAsChanged: () => {
        isChanged = true;
      },
    };

    transformFn(context, fileInfo, api, options);
    if (!isChanged) return null;
    // recast prints with the operating system's line terminator unless told otherwise.
    const lineTerminator = fileInfo.source.includes("\r\n") ? "\r\n" : "\n";
    return root.toSource({ lineTerminator });
  };
}
