import { getEntries, getSchemaObjectComment } from "utils"
import type { OpenAPI3, PathsObject } from "../types"
import { OpenAPISpec, OperationSpec } from "./types"

type Method = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace"

/** transform top-level schema */
export function treatSchema(schema: OpenAPI3, ctx: OpenAPISpec) {
  if (!schema) return

  // paths
  treatPathsObject(schema.paths, ctx)

}

function treatPathsObject(pathsObject: PathsObject, ctx: OpenAPISpec) {

  for (let [path, pathItem] of getEntries(pathsObject, ctx.alphabetize)) {

    // parameters
    let parameters = null
    if (pathItem.parameters && pathItem.parameters.length) {
      parameters = pathItem.parameters
      //transformOperationObject({ parameters: pathItem.parameters }, { path: location, ctx, wrapObject: false }).trim()
    }

    // methods
    for (const method of ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as Method[]) {
      let operObject = pathItem[method]
      if (!operObject) continue
      if ("$ref" in operObject) {
        operObject = ctx.resolveSchema(operObject.$ref)
      }

      const operID = operObject["operationId"] || (method + ":" + path)
      const oper: OperationSpec = new OperationSpec(operID)
      oper.comment = getSchemaObjectComment(operObject)
      oper.schema = operObject
      if (operObject["tags"]) {
        for (const tag of operObject["tags"]) {
          ctx.getTag(tag).getPath(path).setOperation(method, oper)
        }
      }
      else {
        ctx.getTag("default").getPath(path).setOperation(method, oper)
      }
    }
  }

}
