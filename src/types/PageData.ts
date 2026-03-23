interface PageData {
  url: string
  finalUrl: string
  headers: Record<string, string>
  html: string
  cookies: string[]
  jsGlobals?: Record<string, unknown>
}

export default PageData
