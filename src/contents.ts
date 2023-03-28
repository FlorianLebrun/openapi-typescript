
export abstract class Content {
   constructor(readonly type: string) {
   }

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

   abstract stringify(value: any): string
   abstract parse(str: string): any
}

export class JSONContent extends StringifiedContent {
   constructor(readonly type: string = "application/json") {
      super(type)
   }
   override stringify(value: any): string {
      return JSON.stringify(value)
   }
   override parse(str: string): any {
      return JSON.parse(str)
   }
}

export class TextualContent extends Content {
   _str: string = undefined

   constructor(readonly type: string = "plain/text") {
      super(type)
   }
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
}

export class BinaryContent extends Content {
   _buf: Buffer = undefined

   constructor(readonly type: string = "application/octet-stream") {
      super(type)
   }
   fromBuffer(buf: Buffer) {
      this._buf = buf
   }
   fromString(str: string) {
      this._buf = Buffer.from(str)
   }
   fromValue(val: any) {
      throw new Error(`Not supported by BinaryContent`)
   }
   toBuffer(): Buffer {
      return this._buf
   }
   toString(): string {
      return this._buf.toString()
   }
   toValue(): any {
      throw new Error(`Not supported by BinaryContent`)
   }
}

export type ContentCtor = new (type?: string) => Content

export const defaultContentClasses: { [type: string]: ContentCtor } = {
   "plain/text": TextualContent,
   "application/json": JSONContent,
   "application/octet-stream": BinaryContent,
}

export function resolveContentType(type: string): ContentCtor {
   let cls = defaultContentClasses[type]
   if (!cls) {
      for (const ctype in defaultContentClasses) {
         if (type.startsWith(ctype)) {
            return defaultContentClasses[ctype]
         }
      }
   }
   return null
}

export function createContent(type: string): Content {
   let cls = resolveContentType(type)
   if (!cls) return null
   return new cls(type)
}

export function createStringContent(type: string, data: string): Content {
   let cls = resolveContentType(type)
   if (!cls) cls = TextualContent
   try {
      const content = new cls(type)
      content.fromString(data)
      return content
   }
   catch (e) {
      const content = new TextualContent(type)
      content.fromString(data)
      return content
   }
}

export function createBufferContent(type: string, data: Buffer): Content {
   let cls = resolveContentType(type)
   if (!cls) cls = TextualContent
   try {
      const content = new cls(type)
      content.fromBuffer(data)
      return content
   }
   catch (e) {
      const content = new BinaryContent(type)
      content.fromBuffer(data)
      return content
   }
}
