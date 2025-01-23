import { FileInfo, API, JSCodeshift, Collection } from "jscodeshift";

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
    return isChanged ? root.toSource() : null;
  };
}
