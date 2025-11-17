import { ResourceElement } from "../core/types";
import { getResourceFn } from "../core/getResourceFn";

export function tapInlineResource<R, P>(element: ResourceElement<R, P>): R {
  return getResourceFn(element.type)(element.props);
}
