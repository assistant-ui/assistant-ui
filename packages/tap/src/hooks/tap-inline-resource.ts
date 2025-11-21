import { ResourceElement } from "../core/types";
import { callResourceFn } from "../core/callResourceFn";

export function tapInlineResource<R, P>(element: ResourceElement<R, P>): R {
  return callResourceFn(element.type, element.props);
}
