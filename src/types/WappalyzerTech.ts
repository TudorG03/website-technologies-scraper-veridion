interface WappalyzerDomSpec {
    exists?: string
    text?: string
    attributes?: Record<string, string>
    properties?: Record<string, string> // not implemented, kept for potential future addition
}

interface WappalyzerTech {
    cats?: number[]
    website?: string
    scriptSrc?: string | string[]
    scripts?: string | string[]
    html?: string | string[]
    css?: string | string[]
    url?: string | string[]
    headers?: Record<string, string | string[]>
    meta?: Record<string, string | string[]>
    cookies?: Record<string, string | string[]>
    js?: Record<string, string | string[]>
    dom?: string | string[] | Record<string, WappalyzerDomSpec>
    implies?: string | string[]
    excludes?: string | string[]
    description?: string
    icon?: string
    oss?: boolean
    saas?: boolean
    pricing?: string[]
}

export { WappalyzerDomSpec }
export default WappalyzerTech
