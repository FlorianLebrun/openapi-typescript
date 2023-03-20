import type { GlobalContext, OpenAPI3 } from "../types"
import transformComponentsObject from "./components-object"
import transformPathsObject from "./paths-object"
import transformWebhooksObject from "./webhooks-object"

/** transform top-level schema */
export function transformSchema(schema: OpenAPI3, ctx: GlobalContext): Record<string, string> {
  if (!schema) return {}

  const output: Record<string, string> = {}

  // paths
  transformPathsObject(schema.paths, ctx)

  // webhooks
  if (schema.webhooks) output.webhooks = transformWebhooksObject(schema.webhooks, ctx)
  else output.webhooks = ""

  // components
  if (schema.components) output.components = transformComponentsObject(schema.components, ctx)
  else output.components = ""

  return output
}
