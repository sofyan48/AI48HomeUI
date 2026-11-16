// Config documents retain provider-specific and future fields from the backend.
export type ConfigDraft = Record<string, any>
export type ConfigTranslator = (key: any, params?: Record<string, any>) => string
export type ConfigFetch = (path: string, options?: any) => Promise<any>
