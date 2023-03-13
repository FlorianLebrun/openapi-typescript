import type { GlobalContext, OperationObject } from "../types"
import {
  escObjKey,
  getEntries,
  getSchemaObjectComment,
  makeTSIndex,
  parseTSIndex,
  tsIntersectionOf,
  tsNonNullable,
  tsOptionalProperty,
  tsPick,
  tsReadonly,
} from "../utils"
import transformParameterObject from "./parameter-object"
import transformRequestBodyObject from "./request-body-object"
import transformResponseObject from "./response-object"
import transformSchemaObject from "./schema-object"

export interface TransformOperationObjectOptions {
  path: string
  ctx: GlobalContext
  wrapObject?: boolean
}

export default function transformOperationObject(
  operationObject: OperationObject,
  { path, ctx, wrapObject = true }: TransformOperationObjectOptions
): string {
  const output: string[] = wrapObject ? ["{"] : []

  const c = getSchemaObjectComment(operationObject)
  if (c) output.push(c)

  // parameters
  {
    let paramType = "void"
    if (operationObject.parameters) {
      const parameterOutput: string[] = []
      const refs: Record<string, string[]> = {}

      for (const p of operationObject.parameters) {
        // handle inline params
        if ("in" in p) {
          let key = escObjKey(p.name)
          if (p.in !== "path" && !p.required) {
            key = tsOptionalProperty(key)
          }
          const c = getSchemaObjectComment(p)
          if (c) parameterOutput.push(c)
          const parameterType = transformParameterObject(p, {
            path: `${path}/parameters/${p.name}`,
            ctx,
          })
          parameterOutput.push(`${key}: ${parameterType};`)
        }
        // handle $ref’d params
        // note: these can only point to specific parts of the schema, which have already
        // been resolved in the initial step and follow a predictable pattern. so we can
        // do some clever string magic to link them up properly without needing the
        // original object
        else if (p.$ref) {
          const parts = parseTSIndex(p.$ref)
          const paramI = parts.indexOf("parameters")
          if (paramI === -1 || !parts[paramI + 2]) continue
          const key = parts.pop() as string
          const index = makeTSIndex(parts)
          if (!refs[index]) refs[index] = [key]
          else refs[index].push(key)
        }
      }

      // nothing here? skip
      if (parameterOutput.length > 0 || Object.keys(refs).length > 0) {
        paramType = tsIntersectionOf(
          ...(parameterOutput.length ? [`{\n${parameterOutput.join("\n")}\n${"}"}`] : []),
          ...Object.entries(refs).map(([root, keys]) =>
            tsPick(tsNonNullable(root), keys)
          )
        )
      }
    }
    output.push(`parameters: ${paramType}`)
  }

  // requestBody
  {
    let key = "content"
    if (operationObject.requestBody) {
      const c = getSchemaObjectComment(operationObject.requestBody)
      if (c) output.push(c)
      if (ctx.immutableTypes) key = tsReadonly(key)
      if ("$ref" in operationObject.requestBody) {
        output.push(`${key}: ${transformSchemaObject(operationObject.requestBody, { path, ctx })};`)
      } else {
        if (!operationObject.requestBody.required) key = tsOptionalProperty(key)
        const requestBody = transformRequestBodyObject(operationObject.requestBody, {
          path: `${path}/requestBody`,
          ctx,
        })
        output.push(`${key}: ${requestBody};`)
      }
    }
    else {
      output.push(`${key}: void;`)
    }
  }

  // responses
  {
    if (operationObject.responses) {
      const responses: string[] = []
      const exceptions: string[] = []
      for (const [responseCode, responseObject] of getEntries(operationObject.responses, ctx.alphabetize)) {
        const key = escObjKey(responseCode)
        const c = getSchemaObjectComment(responseObject)
        const chunks: string[] = responseCode.startsWith("2") ? responses : exceptions
        if (c) chunks.push(c)
        if ("$ref" in responseObject) {
          chunks.push(
            `${key}: ${transformSchemaObject(responseObject, {
              path: `${path}/responses/${responseCode}`,
              ctx,
            })};`
          )
        } else {
          const responseType = transformResponseObject(responseObject, {
            path: `${path}/responses/${responseCode}`,
            ctx,
          })
          chunks.push(`${key}: ${responseType};`)
        }
      }
      output.push(`responses: {`)
      output.push(...responses)
      output.push(`};`)
      output.push(`exceptions: {`)
      output.push(...exceptions)
      output.push(`};`)
    }
    else {
      output.push(`responses: {};`)
    }
  }

  if (wrapObject) {
    output.push("}")
  }
  return output.join("\n")
}
