import { OperationObject } from "types"

export class OperationSpec {
   comment: string = null
   schema: OperationObject = null
   constructor(
      public name: string = null,
   ) {
   }
}

export class PathSpec {
   methods: { [method: string]: OperationSpec } = {}
   constructor(
      readonly path: string,
   ) {
   }
   setOperation(method: string, op: OperationSpec) {
      this.methods[method] = op
   }
}

export class TagSpec {
   paths: PathSpec[] = []
   constructor(
      readonly name: string,
   ) {
   }
   getPath(path: string): PathSpec {
      let cpath = this.paths.find(x => x.path === path)
      if (!cpath) this.paths.push(cpath = new PathSpec(path))
      return cpath
   }
}

export class OpenAPISpec {
   tags: TagSpec[] = []
   operations: OperationSpec[] = []
   alphabetize = true
   constructor(
      readonly name: string,
      readonly manifold: OpenAPIManifold,
   ) {
   }
   findOperation(name: string): OperationSpec {
      return this.operations.find(x => x.name === name)
   }
   getOperation(name: string): OperationSpec {
      let op = this.operations.find(x => x.name === name)
      if (!op) this.operations.push(op = new OperationSpec())
      return op
   }
   getTag(name: string): TagSpec {
      let tag = this.tags.find(x => x.name === name)
      if (!tag) this.tags.push(tag = new TagSpec(name))
      return tag
   }
   resolveSchema($ref: string): any {
      throw new Error()
   }
}

export class OpenAPIManifold {
   apis: OpenAPISpec[] = []
   resolveOperationRef($ref: string): OperationSpec {
      throw new Error()
   }
   getApi(name: string): OpenAPISpec {
      let api = this.apis.find(x => x.name === name)
      if (!api) this.apis.push(api = new OpenAPISpec(name, this))
      return api
   }
}
