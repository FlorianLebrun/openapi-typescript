import type { GlobalContext, MediaTypeObject, ReferenceObject } from "../types"
import { escStr, getSchemaObjectComment, tsReadonly } from "../utils"
import transformMediaTypeObject from "./media-type-object"
import transformSchemaObject from "./schema-object"

export interface TransformContentBodyObjectOptions {
   path: string
   ctx: GlobalContext
}

export function transformContentBodyObject(
   contentBodyObject: { [contentType: string]: MediaTypeObject | ReferenceObject },
   { path, ctx }: TransformContentBodyObjectOptions
): string {
   if (!Object.keys(contentBodyObject).length) return `${escStr("*/*")}: never`

   const contentTypeChunks: string[] = []
   for (const [contentType, mediaTypeObject] of Object.entries(contentBodyObject)) {
      const c = getSchemaObjectComment(mediaTypeObject)
      if (c) contentTypeChunks.push(c)
      let key = contentType
      if (ctx.immutableTypes) key = tsReadonly(key)

      let mediaType: string
      if ("$ref" in mediaTypeObject) {
         mediaType = transformSchemaObject(mediaTypeObject, {
            path: `${path}/${contentType}`,
            ctx,
         })
      } else {
         mediaType = transformMediaTypeObject(mediaTypeObject, {
            path: `${path}/${contentType}`,
            ctx,
         })
      }
      if (!contentTypeChunks.includes(mediaType)) {
         contentTypeChunks.push(mediaType)
      }
   }

   if (contentTypeChunks.length === 0) {
      return "void"
   }
   return contentTypeChunks.join(" | ")
}
