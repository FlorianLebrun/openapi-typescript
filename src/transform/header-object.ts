import type { GlobalContext, HeaderObject } from "../types"
import { escStr, getEntries, getSchemaObjectComment, tsReadonly } from "../utils"
import transformMediaTypeObject from "./media-type-object"
import transformSchemaObject from "./schema-object"

export interface TransformHeaderObjectOptions {
  path: string
  ctx: GlobalContext
}

export default function transformHeaderObject(
  headerObject: HeaderObject,
  { path, ctx }: TransformHeaderObjectOptions
): string {
  if (headerObject.schema) return transformSchemaObject(headerObject.schema, { path, ctx })
  if (headerObject.content) {

    const output: string[] = ["{"]

    for (const [contentType, mediaTypeObject] of getEntries(headerObject.content, ctx.alphabetize)) {
      const c = getSchemaObjectComment(mediaTypeObject)
      if (c) output.push(c)
      let key = escStr(contentType)
      if (ctx.immutableTypes) key = tsReadonly(key)
      if ("$ref" in mediaTypeObject) {
        output.push(
          `${key}: ${transformSchemaObject(mediaTypeObject, { path: `${path}/${contentType}`, ctx })};`,
        )
      } else {
        const mediaType = transformMediaTypeObject(mediaTypeObject, { path: `${path}/${contentType}`, ctx })
        output.push(`${key}: ${mediaType};`)
      }
    }

    output.push("}")
    return output.join("\n")
  }
  return "unknown"
}
