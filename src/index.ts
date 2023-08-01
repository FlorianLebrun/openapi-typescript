import { Content, JSONContent } from "./contents"
import fs from "node:fs"

export * from "./contents"

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U
export type OneOf<T extends any[]> = T extends [infer Only] ? Only : T extends [infer A, infer B, ...infer Rest] ? OneOf<[XOR<A, B>, ...Rest]> : never

export type WithHeaders<Content, Headers> = Content

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export type OperationInfos = {
   headers?: string[] // Parameter names in headers
   cookies?: string[] // Parameter names in cookies
}

export type OperationParams = {
   [name: string]: any
} | void

export type OperationType = {
   parameters?: OperationParams
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

export abstract class ServiceSession {
   request<Op extends OperationType = OperationType>(method: string, path: string, params?: Op["parameters"], infos?: OperationInfos): ServiceInvokation<Op> {
      return new CommonInvokation<Op>(method, path, params, infos || {}, this)
   }
   get<Op extends OperationType = OperationType>(path: string, params?: Op["parameters"], infos?: OperationInfos): ServiceInvokation<Op> {
      return this.request("get", path, params, infos)
   }
   put<Op extends OperationType = OperationType>(path: string, params?: Op["parameters"], infos?: OperationInfos): ServiceInvokation<Op> {
      return this.request("put", path, params, infos)
   }
   post<Op extends OperationType = OperationType>(path: string, params?: Op["parameters"], infos?: OperationInfos): ServiceInvokation<Op> {
      return this.request("post", path, params, infos)
   }
   patch<Op extends OperationType = OperationType>(path: string, params?: Op["parameters"], infos?: OperationInfos): ServiceInvokation<Op> {
      return this.request("patch", path, params, infos)
   }
   create<Op extends OperationType = OperationType>(path: string, params?: { [key: string]: any }, infos?: OperationInfos): ServiceInvokation {
      return this.request("create", path, params, infos)
   }
   abstract execute(request: ServiceRequest): Promise<ServiceResponse>
}

export interface ServiceInvokation<Op extends OperationType = OperationType, R extends keyof Op["responses"] = keyof Op["responses"]> extends ServiceRequest {
   readonly response: ServiceResponse
   readonly error?: Error
   with(content: Op["content"]): this
   withHeaders(headers: ServiceHeaders): this
   invoke(session?: ServiceSession): Promise<Op["responses"][R]>
}

export class CommonInvokation<Op extends OperationType = OperationType> implements ServiceInvokation<Op>, ServiceRequest {
   path: string
   headers: { [name: string]: string } = {}
   content: Content
   response: ServiceResponse = null
   error: Error = null
   constructor(
      readonly method: string,
      path: string,
      readonly params: OperationParams,
      readonly infos: OperationInfos,
      readonly defaultSession?: ServiceSession,
   ) {
      if (params) {
         const { headers, cookies } = infos
         const parts: string[] = path.match(/({[^}\\/]*}|([^{]*)*)/g)
         let hasQuery = false
         for (const name in params) {
            if (headers && headers.includes(name)) {
               this.headers[name] = params?.[name]
            }
            else if (cookies && cookies.includes(name)) {
               // TODO
            }
            else {
               const placeholder = `{${name}}`
               const value = encodeURIComponent(params[name])
               let index = parts.indexOf(placeholder)
               if (index >= 0) {
                  do {
                     parts[index] = value
                     index = parts.indexOf(placeholder, index)
                  } while (index >= 0)
               }
               else {
                  parts.push(hasQuery ? "&" : "?", name, '=', value)
                  hasQuery = true
               }
            }
         }
         this.path = parts.join("")
      }
      else {
         this.path = path
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
   async invoke(session?: ServiceSession): Promise<Op["responses"]> {
      if (!session) session = this.defaultSession
      this.response = await session.execute(this)
      return this.response.content?.toValue()
   }
}

export type Invokable<Op extends OperationType> = (args: Op["parameters"]) => ServiceInvokation<Op>

export type GenericApisData = {
   server: string
   paths: {
      [path: string]: {
         [method: string]: OperationInfos
      }
   }
}

export type GenericApis = {
   [path: string]: {
      [method: string]: ServiceInvokation<any>
   }
}

export function NewGenericApis(data: GenericApisData): GenericApis {
   const apis: GenericApis = {}
   const { paths } = data
   for (const path in paths) {
      const methods = apis[path] = {}
      for (const method in paths[path]) {
         methods[method] = (params) => new CommonInvokation(method, path, params, paths[path][method], getGlobalSession(data.server))
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

class DefaultSession extends ServiceSession {
   async execute(request: ServiceRequest): Promise<ServiceResponse> {
      throw new ServiceError(`Not implemented`, request)
   }
}

const globalSessions = {
   "default": new DefaultSession()
}

export function setGlobalSession(name: string, session: ServiceSession) {
   globalSessions[name] = session
}

export function getGlobalSession(name: string): ServiceSession {
   return globalSessions[name] || globalSessions.default
}
