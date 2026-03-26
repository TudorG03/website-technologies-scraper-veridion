import { extractVersion, parsePattern, applyPattern, ParsedPattern } from '../../../../src/services/fingerprint/patternUtils'

describe('extractVersion', () => {
    it('substitutes capture group 1', () => {
        expect(extractVersion('\\1', ['full', '3.6.0'])).toBe('3.6.0')
    })

    it('substitutes capture group with prefix', () => {
        expect(extractVersion('v\\1', ['full', '3.6.0'])).toBe('v3.6.0')
    })

    it('substitutes multiple capture groups', () => {
        expect(extractVersion('\\1.\\2', ['full', '3', '6'])).toBe('3.6')
    })

    it('ternary returns ifTrue when group matched', () => {
        expect(extractVersion('\\1?GPL:proprietary', ['full', 'GPL-3.0'])).toBe('GPL')
    })

    it('ternary returns ifFalse when group did not match', () => {
        expect(extractVersion('\\1?GPL:proprietary', ['full', ''])).toBe('proprietary')
    })

    it('ternary with empty ifFalse returns empty string', () => {
        expect(extractVersion('\\1?a:', ['full', ''])).toBe('')
    })

    it('ternary with empty ifTrue returns empty string', () => {
        expect(extractVersion('\\1?:b', ['full', 'x'])).toBe('')
    })

    it('returns empty string when capture group is undefined', () => {
        expect(extractVersion('\\1', ['full'])).toBe('')
    })
})

describe('parsePattern', () => {
    it('parses a plain regex with default confidence', () => {
        const result = parsePattern('jquery\\.js')
        expect(result).not.toBeNull()
        expect(result!.regex).toEqual(/jquery\.js/i)
        expect(result!.confidence).toBe(100)
        expect(result!.versionTemplate).toBeUndefined()
    })

    it('parses confidence tag', () => {
        const result = parsePattern('foo\\.js\\;confidence:50')
        expect(result).not.toBeNull()
        expect(result!.regex).toEqual(/foo\.js/i)
        expect(result!.confidence).toBe(50)
    })

    it('parses version tag', () => {
        const result = parsePattern('bar\\.js\\;version:\\1')
        expect(result).not.toBeNull()
        expect(result!.versionTemplate).toBe('\\1')
    })

    it('parses both confidence and version tags', () => {
        const result = parsePattern('baz\\.js\\;confidence:75\\;version:\\1')
        expect(result).not.toBeNull()
        expect(result!.confidence).toBe(75)
        expect(result!.versionTemplate).toBe('\\1')
    })

    it('empty pattern string returns null regex (presence check)', () => {
        const result = parsePattern('')
        expect(result).not.toBeNull()
        expect(result!.regex).toBeNull()
        expect(result!.confidence).toBe(100)
    })

    it('pattern with only confidence tag has null regex', () => {
        const result = parsePattern('\\;confidence:50')
        expect(result).not.toBeNull()
        expect(result!.regex).toBeNull()
        expect(result!.confidence).toBe(50)
    })

    it('returns null for invalid regex', () => {
        expect(parsePattern('[invalid')).toBeNull()
    })
})

describe('applyPattern', () => {
    it('null regex always matches', () => {
        const parsed: ParsedPattern = { regex: null, confidence: 100 }
        expect(applyPattern(parsed, 'anything')).toEqual({ matched: true, version: undefined })
    })

    it('matching regex returns matched true', () => {
        const parsed: ParsedPattern = { regex: /jquery/i, confidence: 100 }
        expect(applyPattern(parsed, 'jquery.min.js')).toMatchObject({ matched: true })
    })

    it('non-matching regex returns matched false', () => {
        const parsed: ParsedPattern = { regex: /jquery/i, confidence: 100 }
        expect(applyPattern(parsed, 'angular.js')).toEqual({ matched: false })
    })

    it('extracts version from capture group', () => {
        const parsed: ParsedPattern = {
            regex: /jquery\.js\?ver=([\d.]+)/i,
            confidence: 100,
            versionTemplate: '\\1'
        }
        expect(applyPattern(parsed, 'jquery.js?ver=3.6.0')).toEqual({ matched: true, version: '3.6.0' })
    })

    it('returns undefined version when capture group did not match', () => {
        const parsed: ParsedPattern = {
            regex: /jquery\.js(?:\?ver=([\d.]+))?/i,
            confidence: 100,
            versionTemplate: '\\1'
        }
        const result = applyPattern(parsed, 'jquery.js')
        expect(result.matched).toBe(true)
        expect(result.version).toBeUndefined()
    })
})
