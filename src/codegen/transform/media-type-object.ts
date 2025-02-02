import type { GlobalContext, MediaTypeObject } from "../types"
import transformSchemaObject from "./schema-object"

export interface TransformMediaTypeObjectOptions {
  path: string
  ctx: GlobalContext
}

export default function transformMediaTypeObject(
  mediaTypeObject: MediaTypeObject,
  { path, ctx }: TransformMediaTypeObjectOptions
): string {
  if (!mediaTypeObject.schema) return "unknown"
  return transformSchemaObject(mediaTypeObject.schema, { path, ctx })
}
