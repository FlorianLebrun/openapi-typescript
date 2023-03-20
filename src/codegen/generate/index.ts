import { OperationInfos } from "../..";
import { escStr } from "../utils";
import { OpenAPISpec, TagSpec } from "./types";

type Files = { [filename: string]: string }

export function generateApisFiles(ctx: OpenAPISpec): Files {
   const files: Files = {}

   for (const tag of ctx.tags) {
      generateApiCatalogFiles(files, tag, ctx)
   }

   return files
}

export function generateApiCatalogFiles(files: Files, tag: TagSpec, ctx: OpenAPISpec) {
   const code = []

   code.push(
      `import { NewApis, Invokable } from \"@ewam/openapi-helpers\"`,
      `import { operations } from \"../types\"`,
      `import data from \"../data/${tag.name}\"`,
      ``
   )
   code.push(`export type paths = {`)
   for (const path of tag.paths) {
      code.push(`  ${escStr(path.path)}: {`)
      for (const method in path.methods) {
         const oper = path.methods[method]
         code.push(`    ${method}: Invokable<operations[${escStr(oper.name)}]>`)
      }
      code.push(`  }`)
   }
   code.push(`}`)
   code.push(``)
   code.push(`export default NewApis<paths>(data)`)
   code.push(``)
   files[`api/${tag.name}.ts`] = code.join("\n")

   const data = {
      server: ctx.name,
      paths: {}
   }
   for (const path of tag.paths) {
      data.paths[path.path] = {}
      for (const method in path.methods) {
         const infos: OperationInfos = {}
         const oper = path.methods[method]
         if (oper.params) {
            for (const param of oper.params) {
               if (param.in === "query") {
                  if (!infos.headers) infos.headers = []
                  infos.headers.push(param.name)
               }
            }
         }
         data.paths[path.path][method] = infos
      }
   }
   files[`data/${tag.name}.js`] = "export default " + JSON.stringify(data, null, 2)
}
