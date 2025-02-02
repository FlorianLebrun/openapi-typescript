import type { GlobalContext, ParameterObject } from "../types"
import transformSchemaObject from "./schema-object"

export interface TransformParameterObjectOptions {
  path: string
  ctx: GlobalContext
}

export default function transformParameterObject(
  parameterObject: ParameterObject,
  { path, ctx }: TransformParameterObjectOptions
): string {
  return parameterObject.schema ? transformSchemaObject(parameterObject.schema, { path, ctx }) : "string" // assume a parameter is a string by default rather than "unknown"
}
