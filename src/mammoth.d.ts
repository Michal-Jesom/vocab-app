declare module 'mammoth' {
  interface ExtractResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }

  export function extractRawText(options: {
    arrayBuffer: ArrayBuffer
    buffer?: never
  }): Promise<ExtractResult>

  export function extractRawText(options: {
    buffer: Buffer
    arrayBuffer?: never
  }): Promise<ExtractResult>
}
