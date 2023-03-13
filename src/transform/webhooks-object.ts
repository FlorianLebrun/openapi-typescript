import type { GlobalContext, WebhooksObject } from "../types"
import { escStr, getEntries } from "../utils"
import transformPathItemObject from "./path-item-object"

export default function transformWebhooksObject(webhooksObject: WebhooksObject, ctx: GlobalContext): string {
  const output: string[] = ["{"]
  for (const [name, pathItemObject] of getEntries(webhooksObject, ctx.alphabetize)) {
    output.push(
      `${escStr(name)}: ${transformPathItemObject(pathItemObject, {
        path: `#/webhooks/${name}`,
        ctx,
      })};`
    )
  }
  output.push("}")
  return output.join("\n")
}
