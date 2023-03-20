import type { GlobalContext, RequestBodyObject } from "../types"
import { transformContentBodyObject } from "./content-body-object"

export interface TransformRequestBodyObjectOptions {
  path: string
  ctx: GlobalContext
}

export default function transformRequestBodyObject(
  requestBodyObject: RequestBodyObject,
  { path, ctx }: TransformRequestBodyObjectOptions
): string {
  return transformContentBodyObject(requestBodyObject.content, { path, ctx })
}
