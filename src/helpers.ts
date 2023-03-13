import fs from "node:fs"

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U
export type OneOf<T extends any[]> = T extends [infer Only] ? Only : T extends [infer A, infer B, ...infer Rest] ? OneOf<[XOR<A, B>, ...Rest]> : never

export type WithHeaders<Content, Headers> = Content

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export type OperationInfos = {
   headers?: { [key: string]: string } // Map header to parameter name
}

export type OperationType = {
   parameters?: any
   content?: any
   responses: { [code: string]: any }
   exceptions: { [code: string]: any }
}

export type ServiceHeaderValue = ServiceHeaders | string | string[] | number | boolean | null;

export type ServiceHeaders = {
   [name: string]: ServiceHeaderValue
}

export interface ServiceRequest {
   readonly method: string
   readonly path: string
   readonly headers: ServiceHeaders
   readonly content: Content
}

export interface ServiceResponse {
   readonly status: string
   readonly headers: ServiceHeaders
   readonly content: Content
}

export class ServiceError extends Error {
   constructor(message: string,
      readonly request?: ServiceRequest,
      readonly response?: ServiceResponse,
   ) {
      super(message)
   }
}

export interface ServiceSession {
   query(method: string, path: string, params?: { [key: string]: any }, infos?: OperationInfos): Invokation
   execute(request: ServiceRequest): Promise<ServiceResponse>
}

export interface Invokation<Op extends OperationType = OperationType, R extends keyof Op["responses"] = keyof Op["responses"]> extends ServiceRequest {
   readonly response: ServiceResponse
   readonly error?: Error
   with(content: Op["content"]): this
   withHeaders(headers: ServiceHeaders): this
   invoke(session?: ServiceSession): Promise<Op["responses"][R]>
}

export abstract class Content {
   abstract getType(): string

   abstract fromBuffer(buf: Buffer)
   abstract fromString(str: string)
   abstract fromValue(val: any)

   abstract toBuffer(): Buffer
   abstract toString(): string
   abstract toValue(): any
}

export abstract class StringifiedContent extends Content {
   _str: string = undefined
   _val: any = undefined

   fromBuffer(buf: Buffer) {
      this._str = buf.toString('utf8')
      this._val = undefined
   }
   fromString(str: string) {
      this._str = str
      this._val = undefined
   }
   fromValue(val: any) {
      this._str = undefined
      this._val = val
   }
   toBuffer(): Buffer {
      return Buffer.from(this.toString())
   }
   toString(): string {
      if (this._str === undefined && this._val !== undefined) {
         this._str = this.stringify(this._val)
      }
      return this._str
   }
   toValue(): any {
      if (this._val === undefined && this._str !== undefined) {
         this._val = this.parse(this._str)
      }
      return this._val
   }

   abstract getType(): string
   abstract stringify(value: any): string
   abstract parse(str: string): any
}

export class JSONContent extends StringifiedContent {
   getType() {
      return "application/json"
   }
   override stringify(value: any): string {
      return JSON.stringify(value)
   }
   override parse(str: string): any {
      return JSON.parse(str)
   }
}

export abstract class TextualContent extends Content {
   _str: string = undefined

   fromBuffer(buf: Buffer) {
      this._str = buf.toString('utf8')
   }
   fromString(str: string) {
      this._str = str
   }
   fromValue(val: any) {
      this._str = val.toString()
   }
   toBuffer(): Buffer {
      return Buffer.from(this.toString())
   }
   toString(): string {
      return this._str
   }
   toValue(): any {
      return this._str
   }

   abstract getType(): string
}

export class PlainTextContent extends TextualContent {
   getType(): string {
      return "plain/text"
   }
}

export const defaultContentClasses: { [contentType: string]: new () => Content } = {
   "application/json": JSONContent,
}

export class WebInvokation implements Invokation, ServiceRequest {
   headers: { [name: string]: string } = {}
   content: Content
   response: ServiceResponse = null
   error: Error = null
   constructor(
      readonly method: string,
      readonly path: string,
      readonly params: { [key: string]: any },
      readonly infos: OperationInfos,
      readonly defaultSession?: ServiceSession,
   ) {
      const { headers } = infos
      if (headers) {
         for (const key in headers) {
            const paramName = headers[key]
            this.headers[key] = params?.[paramName]
         }
      }
   }
   get request() {
      return this
   }
   with(data: any): this {
      if (data instanceof Content) {
         this.content = data
      }
      else {
         this.content = new JSONContent()
         this.content.fromValue(data)
      }
      return this
   }
   withHeaders(headers: ServiceHeaders): this {
      Object.assign(this.headers, headers)
      return this
   }
   async invoke(session?: ServiceSession): Promise<Response> {
      if (!session) {
         if (this.defaultSession) session = this.defaultSession
         else session = defaultSession
      }
      //console.log("args", this.args)
      console.log("content", this.content.toString())
      this.response = await session.execute(this)
      return this.response.content?.toValue()
   }
}

export type Invokable<Op extends OperationType> = (args: Op["parameters"]) => Invokation<Op>

export type GenericApis = {
   [path: string]: {
      [method: string]: Invokation<any>
   }
}

export function NewGenericApis(data: any): GenericApis {
   const apis: GenericApis = {}
   for (const path in data) {
      const methods = apis[path] = {}
      for (const method in data[path]) {
         methods[method] = (params) => new WebInvokation(method, path, params, data[path][method])
      }
   }
   return apis
}

export function NewApis<T>(data: any): T {
   return NewGenericApis(data) as T
}

export function NewApisFrom<T>(url: URL): T {
   return NewGenericApis(LoadJSON(url)) as T
}

function LoadJSON(url: URL): any {
   const data = fs.readFileSync(url).toString()
   return JSON.parse(data)
}

class DefaultSession implements ServiceSession {
   query(method: string, path: string, params?: { [key: string]: any }, infos?: OperationInfos
   ): Invokation {
      return new WebInvokation(method, path, params, infos, this)
   }
   async execute(request: ServiceRequest): Promise<ServiceResponse> {
      throw new ServiceError(`Not implemented`, request)
   }
}

let defaultSession = new DefaultSession()
