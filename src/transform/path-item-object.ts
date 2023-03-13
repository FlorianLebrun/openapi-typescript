import type { GlobalContext, PathItemObject } from "../types"
import { escStr, getSchemaObjectComment } from "../utils"
import transformOperationObject from "./operation-object"

export interface TransformPathItemObjectOptions {
  path: string
  ctx: GlobalContext
}

type Method = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace"

export default function transformPathItemObject(
  pathItem: PathItemObject,
  { path, ctx }: TransformPathItemObjectOptions
): string {
  const output: string[] = []
  output.push("{")

  // methods
  for (const method of ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as Method[]) {
    const operationObject = pathItem[method]
    if (!operationObject) continue
    const c = getSchemaObjectComment(operationObject)
    if (c) output.push(c)
    let pathOperationType = ""
    if ("$ref" in operationObject) {
      pathOperationType = operationObject.$ref
    }
    // if operationId exists, move into an `operations` export and pass the reference in here
    else if (operationObject.operationId) {
      ctx.operations[operationObject.operationId] = transformOperationObject(operationObject, { path, ctx })
    } else {
      ctx.operations[method + ":" + path] = transformOperationObject(operationObject, { path, ctx })
    }
  }

  // parameters
  if (pathItem.parameters && pathItem.parameters.length) {
    ctx.operations[path] = transformOperationObject({ parameters: pathItem.parameters }, { path, ctx, wrapObject: false })
  }

  output.push("}")
  return output.join("\n")
}
