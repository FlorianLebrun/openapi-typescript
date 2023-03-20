import type { ComponentsObject, GlobalContext } from "../types"
import { escObjKey, getEntries, getSchemaObjectComment, tsOptionalProperty, tsReadonly } from "../utils"
import transformHeaderObject from "./header-object"
import transformParameterObject from "./parameter-object"
import transformPathItemObject from "./path-item-object"
import transformRequestBodyObject from "./request-body-object"
import transformResponseObject from "./response-object"
import transformSchemaObject from "./schema-object"

export default function transformComponentsObject(components: ComponentsObject, ctx: GlobalContext): string {
  const output: string[] = ["{"]

  // schemas
  if (components.schemas) {
    output.push("schemas: {")
    for (const [name, schemaObject] of getEntries(components.schemas, ctx.alphabetize)) {
      const c = getSchemaObjectComment(schemaObject)
      if (c) output.push(c)
      let key = escObjKey(name)
      if (ctx.immutableTypes || schemaObject.readOnly) key = tsReadonly(key)
      const schemaType = transformSchemaObject(schemaObject, {
        path: `#/components/schemas/${name}`,
        ctx,
      })
      output.push(`${key}: ${schemaType};`)
    }
    output.push("};")
  } else {
    output.push("schemas: never;")
  }

  // responses
  if (components.responses) {
    output.push("responses: {")
    for (const [name, responseObject] of getEntries(components.responses, ctx.alphabetize)) {
      const c = getSchemaObjectComment(responseObject)
      if (c) output.push(c)
      let key = escObjKey(name)
      if (ctx.immutableTypes) key = tsReadonly(key)
      if ("$ref" in responseObject) {
        output.push(
          `${key}": ${transformSchemaObject(responseObject, { path: `#/components/responses/${name}`, ctx })};`,
        )
      } else {
        const responseType = transformResponseObject(responseObject, {
          path: `#/components/responses/${name}`,
          ctx,
        })
        output.push(`${key}: ${responseType};`)
      }
    }
    output.push("};")
  } else {
    output.push("responses: never;")
  }

  // parameters
  if (components.parameters) {
    output.push("parameters: {")
    for (const [name, parameterObject] of getEntries(components.parameters, ctx.alphabetize)) {
      const c = getSchemaObjectComment(parameterObject)
      if (c) output.push(c)
      let key = escObjKey(name)
      if (ctx.immutableTypes) key = tsReadonly(key)
      if ("$ref" in parameterObject) {
        output.push(
          `${key}: ${transformSchemaObject(parameterObject, { path: `#/components/parameters/${name}`, ctx })};`,
        )
      } else {
        const parameterType = transformParameterObject(parameterObject, {
          path: `#/components/parameters/${name}`,
          ctx,
        })
        output.push(`${key}: ${parameterType};`)
      }
    }
    output.push("};")
  } else {
    output.push("parameters: never;")
  }

  // requestBodies
  if (components.requestBodies) {
    output.push("requestBodies: {")
    for (const [name, requestBodyObject] of getEntries(components.requestBodies, ctx.alphabetize)) {
      const c = getSchemaObjectComment(requestBodyObject)
      if (c) output.push(c)
      let key = escObjKey(name)
      if ("$ref" in requestBodyObject) {
        if (ctx.immutableTypes) key = tsReadonly(key)
        output.push(
          `${key}: ${transformSchemaObject(requestBodyObject, {
            path: `#/components/requestBodies/${name}`,
            ctx,
          })};`
        )
      } else {
        if (!requestBodyObject.required) key = tsOptionalProperty(key)
        if (ctx.immutableTypes) key = tsReadonly(key)
        const requestBodyType = transformRequestBodyObject(requestBodyObject, {
          path: `#/components/requestBodies/${name}`,
          ctx,
        })
        output.push(`${key}: ${requestBodyType};`)
      }
    }
    output.push("};")
  } else {
    output.push("requestBodies: never;")
  }

  // headers
  if (components.headers) {
    output.push("headers: {")
    for (const [name, headerObject] of getEntries(components.headers, ctx.alphabetize)) {
      const c = getSchemaObjectComment(headerObject)
      if (c) output.push(c)
      let key = escObjKey(name)
      if (ctx.immutableTypes) key = tsReadonly(key)
      if ("$ref" in headerObject) {
        output.push(
          `${key}: ${transformSchemaObject(headerObject, { path: `#/components/headers/${name}`, ctx })};`,
        )
      } else {
        const headerType = transformHeaderObject(headerObject, {
          path: `#/components/headers/${name}`,
          ctx,
        })
        output.push(`${key}: ${headerType};`)
      }
    }
    output.push("};")
  } else {
    output.push("headers: never;")
  }

  // pathItems
  if (components.pathItems) {
    output.push("pathItems: {")
    for (const [name, pathItemObject] of getEntries(components.pathItems, ctx.alphabetize)) {
      let key = escObjKey(name)
      if (ctx.immutableTypes) key = tsReadonly(key)
      if ("$ref" in pathItemObject) {
        const c = getSchemaObjectComment(pathItemObject)
        if (c) output.push(c)
        output.push(
          `${key}: ${transformSchemaObject(pathItemObject, { path: `#/components/pathItems/${name}`, ctx })};`,
        )
      } else {
        output.push(
          `${key}: ${transformPathItemObject(pathItemObject, {
            path: `#/components/pathItems/${name}`,
            ctx,
          })};`
        )
      }
    }
    output.push("};")
  } else {
    output.push("pathItems: never;")
  }

  output.push("}")
  return output.join("\n")
}
