export interface ParsedPattern {
    regex: RegExp | null
    confidence: number
    versionTemplate?: string
}

export function parsePattern(pattern: string): ParsedPattern | null {
    const parts = pattern.split('\\;')
    try {
        let regex: RegExp | null = null
        let confidence = 100
        let versionTemplate = undefined

        if (parts[0] !== '') {
            regex = new RegExp(parts[0], 'i')
        }

        for (let i = 1; i < parts.length; i++) {
            if (parts[i].startsWith('confidence')) {
                confidence = parseInt(parts[i].split(':')[1])
            }

            if (parts[i].startsWith('version')) {
                versionTemplate = parts[i].slice('version:'.length)
            }
        }

        return {
            regex,
            confidence,
            versionTemplate
        }
    } catch (error) {
        return null
    }
}

export function extractVersion(template: string, match: RegExpMatchArray): string {
    return template.replace(/\\(\d)(?:\?([^:]*):([^\\]*))?/g, (_, n, ifTrue, ifFalse) => {
        const val = match[parseInt(n, 10)] ?? ''
        if (ifTrue !== undefined) {
            return val ? ifTrue : (ifFalse ?? '')
        }
        return val
    })
}

export function applyPattern(parsed: ParsedPattern, value: string): { matched: boolean, version?: string } {
    let matched = false
    let version = undefined

    if (parsed.regex === null) {
        return {
            matched: true,
            version: undefined
        }
    }

    const matchArr = value.match(parsed.regex)

    if (matchArr) {
        matched = true;

        if (parsed.versionTemplate) {
            version = extractVersion(parsed.versionTemplate, matchArr) || undefined
        }
    }

    return {
        matched,
        version
    }
}
