import type { GlobalContext, PathsObject } from "../types"
import { escStr, getEntries } from "../utils"
import transformParameterObject from "./parameter-object"
import transformPathItemObject from "./path-item-object"

export default function transformPathsObject(pathsObject: PathsObject, ctx: GlobalContext) {
  for (const [url, pathItemObject] of getEntries(pathsObject, ctx.alphabetize)) {
    transformPathItemObject(pathItemObject, {
      path: `#/paths/${url}`,
      ctx,
    })
  }
}
