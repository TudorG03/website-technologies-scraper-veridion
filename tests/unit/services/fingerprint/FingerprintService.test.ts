import FingerprintService from '../../../../src/services/fingerprint/FingerprintService'
import WappalyzerTech from '../../../../src/types/WappalyzerTech'
import RawSignal from '../../../../src/types/RawSignal'

const technologies: Record<string, WappalyzerTech> = {
    jQuery: {
        scriptSrc: ['jquery(?:\\.min)?\\.js(?:\\?ver=([\\d.]+))?\\;version:\\1'],
        website: 'https://jquery.com',
    },
    WordPress: {
        meta: { generator: 'WordPress ([\\d.]+)\\;version:\\1' },
        website: 'https://wordpress.org',
    },
    PHP: {
        headers: { 'x-powered-by': 'PHP/([\\d.]+)\\;version:\\1' },
        website: 'https://php.net',
    },
    MultiPattern: {
        scriptSrc: ['match-a\\.js\\;confidence:75', 'match-b\\.js\\;confidence:75'],
        website: 'https://example.com',
    },
    LowConf: {
        scriptSrc: ['lowconf\\.js\\;confidence:30'],
        website: 'https://example.com',
    },
    DomArray: {
        dom: ["iframe[src*='app.example.com']"],
        website: 'https://example.com',
    },
    DomExists: {
        dom: { "meta[name='generator']": { exists: '' } },
        website: 'https://example.com',
    },
    DomText: {
        dom: { 'h1.title': { text: 'Welcome to ([\\w]+)\\;version:\\1' } },
        website: 'https://example.com',
    },
    DomAttributes: {
        dom: { "link[href*='themes/astra']": { attributes: { href: 'astra\\S*\\.css(?:\\?ver=([\\d.]+))?\\;version:\\1' } } },
        website: 'https://example.com',
    },
    DomEmptySpec: {
        dom: { 'script.some-widget': {} },
        website: 'https://example.com',
    },
}

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}

describe('FingerprintService', () => {
    const service = new FingerprintService(mockLogger as any, technologies)

    it('detects a technology when scriptSrc pattern matches', () => {
        const signals: RawSignal[] = [
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'https://cdn.example.com/jquery.min.js' }
        ]
        const results = service.fingerprint(signals)
        expect(results.map(r => r.name)).toContain('jQuery')
    })

    it('extracts version from scriptSrc capture group', () => {
        const signals: RawSignal[] = [
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'https://cdn.example.com/jquery.min.js?ver=3.6.0' }
        ]
        const results = service.fingerprint(signals)
        const jquery = results.find(r => r.name === 'jQuery')
        expect(jquery?.evidence[0].version).toBe('3.6.0')
    })

    it('detects a technology when header pattern matches', () => {
        const signals: RawSignal[] = [
            { signalType: 'header', key: 'x-powered-by', value: 'PHP/8.1.0' }
        ]
        const results = service.fingerprint(signals)
        expect(results.map(r => r.name)).toContain('PHP')
    })

    it('header key lookup is case-insensitive', () => {
        const signals: RawSignal[] = [
            { signalType: 'header', key: 'X-Powered-By', value: 'PHP/8.1.0' }
        ]
        const results = service.fingerprint(signals)
        expect(results.map(r => r.name)).toContain('PHP')
    })

    it('detects a technology when meta pattern matches', () => {
        const signals: RawSignal[] = [
            { signalType: 'meta', key: 'generator', value: 'WordPress 6.4.2' }
        ]
        const results = service.fingerprint(signals)
        expect(results.map(r => r.name)).toContain('WordPress')
    })

    it('caps confidence at 100 when both patterns match', () => {
        const signals: RawSignal[] = [
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'match-a.js' },
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'match-b.js' },
        ]
        const results = service.fingerprint(signals)
        const tech = results.find(r => r.name === 'MultiPattern')
        expect(tech?.confidence).toBe(100)
    })

    it('uses partial confidence when only one of two patterns matches', () => {
        const signals: RawSignal[] = [
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'match-a.js' },
        ]
        const results = service.fingerprint(signals)
        const tech = results.find(r => r.name === 'MultiPattern')
        expect(tech?.confidence).toBe(75)
    })

    it('excludes technology with confidence below 50', () => {
        const signals: RawSignal[] = [
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'lowconf.js' }
        ]
        const results = service.fingerprint(signals)
        expect(results.map(r => r.name)).not.toContain('LowConf')
    })

    it('returns empty array when no signals match any technology', () => {
        const signals: RawSignal[] = [
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'unknown-library.js' }
        ]
        const results = service.fingerprint(signals)
        expect(results).toHaveLength(0)
    })

    it('sets wappalyzerReference to the website field', () => {
        const signals: RawSignal[] = [
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'jquery.min.js' }
        ]
        const results = service.fingerprint(signals)
        const jquery = results.find(r => r.name === 'jQuery')
        expect(jquery?.wappalyzerReference).toBe('https://jquery.com')
    })

    it('detects array-style dom technology when signal key matches selector', () => {
        const signals: RawSignal[] = [
            { signalType: 'dom', key: "iframe[src*='app.example.com']", value: '' }
        ]
        const results = service.fingerprint(signals)
        expect(results.map(r => r.name)).toContain('DomArray')
    })

    it('detects dom technology with exists spec', () => {
        const signals: RawSignal[] = [
            { signalType: 'dom', key: "meta[name='generator']", value: '' }
        ]
        const results = service.fingerprint(signals)
        expect(results.map(r => r.name)).toContain('DomExists')
    })

    it('detects dom technology with text spec and extracts version', () => {
        const signals: RawSignal[] = [
            { signalType: 'dom', key: 'h1.title', value: 'Welcome to MyApp' }
        ]
        const results = service.fingerprint(signals)
        const tech = results.find(r => r.name === 'DomText')
        expect(tech).toBeDefined()
        expect(tech?.evidence[0].version).toBe('MyApp')
    })

    it('detects dom technology with attributes spec and extracts version', () => {
        const signals: RawSignal[] = [
            { signalType: 'dom', key: "link[href*='themes/astra']", value: '/wp-content/themes/astra/style.css?ver=3.9.2' }
        ]
        const results = service.fingerprint(signals)
        const tech = results.find(r => r.name === 'DomAttributes')
        expect(tech).toBeDefined()
        expect(tech?.evidence[0].version).toBe('3.9.2')
    })

    it('detects dom technology with empty spec as exists check', () => {
        const signals: RawSignal[] = [
            { signalType: 'dom', key: 'script.some-widget', value: '' }
        ]
        const results = service.fingerprint(signals)
        expect(results.map(r => r.name)).toContain('DomEmptySpec')
    })
})
