import type { GlobalContext, ResponseObject } from "../types"
import {
  escObjKey,
  getEntries,
  getSchemaObjectComment,
  tsOptionalProperty,
  tsReadonly,
} from "../utils"
import transformHeaderObject from "./header-object"
import { transformContentBodyObject } from "./content-body-object"

export interface TransformResponseObjectOptions {
  path: string
  ctx: GlobalContext
}

export default function transformResponseObject(
  responseObject: ResponseObject,
  { path, ctx }: TransformResponseObjectOptions
): string {

  // never
  if (!responseObject.content) {
    return "never"
  }

  // content
  let contentType = "void"
  if (responseObject.content) {
    contentType = transformContentBodyObject(responseObject.content, { path, ctx })
  }

  // headers
  if (responseObject.headers) {
    const headersOutput: string[] = []
    headersOutput.push(`WithHeaders<${contentType}, {`)
    for (const [name, headerObject] of getEntries(responseObject.headers, ctx.alphabetize)) {
      const c = getSchemaObjectComment(headerObject)
      if (c) headersOutput.push(c)
      let key = escObjKey(name)
      if (ctx.immutableTypes) key = tsReadonly(key)
      if ("$ref" in headerObject) {
        headersOutput.push(`${key}: ${headerObject.$ref};`)
      } else {
        if (!headerObject.required) key = tsOptionalProperty(key)
        headersOutput.push(
          `${key}: ${transformHeaderObject(headerObject, {
            path: `${path}/headers/${name}`,
            ctx,
          })};`
        )
      }
    }
    headersOutput.push(`}>`)
    contentType = headersOutput.join("\n")
  }

  return contentType
}
