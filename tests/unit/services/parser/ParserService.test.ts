import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import ParserService from '../../../../src/services/parser/ParserService'
import PageData from '../../../../src/types/PageData'

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}

const makeConfig = (techDir: string) => ({
    getTechnologiesDir: () => techDir,
})

const FIXTURE_TECHNOLOGIES = {
    HeaderTech: {
        headers: { 'x-powered-by': 'TestFramework/([\\d.]+)\\;version:\\1' },
        website: 'https://example.com',
    },
    DomStringTech: {
        dom: 'div#app',
        website: 'https://example.com',
    },
    DomArrayTech: {
        dom: ['span.widget'],
        website: 'https://example.com',
    },
    DomExistsTech: {
        dom: { "meta[name='generator']": { exists: '' } },
        website: 'https://example.com',
    },
    DomTextTech: {
        dom: { h1: { text: 'Hello ([\\w]+)\\;version:\\1' } },
        website: 'https://example.com',
    },
    DomAttrTech: {
        dom: {
            'link[rel="stylesheet"]': {
                attributes: { href: 'styles/([\\w]+)\\.css\\;version:\\1' },
            },
        },
        website: 'https://example.com',
    },
    JsTech: {
        js: { 'MyLib.version': '' },
        website: 'https://example.com',
    },
    ImplierTech: {
        headers: { 'x-implier': '' },
        implies: ['ImpliedTech'],
        website: 'https://example.com',
    },
    ImpliedTech: {
        website: 'https://example.com',
    },
}

const FIXTURE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="generator" content="TestCMS 2.0">
  <link rel="stylesheet" href="styles/bootstrap.css">
</head>
<body>
  <div id="app"></div>
  <span class="widget">some widget</span>
  <h1>Hello World</h1>
</body>
</html>
`

const basePageData: PageData = {
    url: 'https://example.com',
    finalUrl: 'https://example.com',
    headers: {},
    html: FIXTURE_HTML,
    cookies: [],
}

describe('ParserService', () => {
    let tmpDir: string

    beforeAll(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'parser-test-'))
        await fs.writeFile(
            path.join(tmpDir, 'fixture.json'),
            JSON.stringify(FIXTURE_TECHNOLOGIES),
            'utf-8'
        )
    })

    afterAll(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('throws when parse() is called before initialize()', () => {
        const service = new ParserService(mockLogger as any, makeConfig('') as any)
        expect(() => service.parse(basePageData)).toThrow('ParserService not initialized')
    })

    describe('after initialize()', () => {
        let service: ParserService

        beforeEach(async () => {
            service = new ParserService(mockLogger as any, makeConfig(tmpDir) as any)
            await service.initialize()
        })

        it('detects a technology via HTTP header with version', () => {
            const pageData: PageData = {
                ...basePageData,
                headers: { 'x-powered-by': 'TestFramework/2.1' },
            }
            const results = service.parse(pageData)
            const found = results.find(r => r.name === 'HeaderTech')
            expect(found).toBeDefined()
            expect(found?.evidence[0].version).toBe('2.1')
        })

        it('detects a technology via dom string selector', () => {
            const results = service.parse(basePageData)
            expect(results.map(r => r.name)).toContain('DomStringTech')
        })

        it('detects a technology via dom array selector', () => {
            const results = service.parse(basePageData)
            expect(results.map(r => r.name)).toContain('DomArrayTech')
        })

        it('detects a technology via dom object exists check', () => {
            const results = service.parse(basePageData)
            expect(results.map(r => r.name)).toContain('DomExistsTech')
        })

        it('detects a technology via dom object text check with version extraction', () => {
            const results = service.parse(basePageData)
            const found = results.find(r => r.name === 'DomTextTech')
            expect(found).toBeDefined()
            expect(found?.evidence[0].version).toBe('World')
        })

        it('detects a technology via dom object attributes check with version extraction', () => {
            const results = service.parse(basePageData)
            const found = results.find(r => r.name === 'DomAttrTech')
            expect(found).toBeDefined()
            expect(found?.evidence[0].version).toBe('bootstrap')
        })

        it('detects a technology via js globals using dot-path traversal', () => {
            const pageData: PageData = {
                ...basePageData,
                jsGlobals: { MyLib: { version: '1.2.3' } },
            }
            const results = service.parse(pageData)
            expect(results.map(r => r.name)).toContain('JsTech')
        })

        it('resolves implied technologies transitively', () => {
            const pageData: PageData = {
                ...basePageData,
                headers: { 'x-implier': 'present' },
            }
            const results = service.parse(pageData)
            const names = results.map(r => r.name)
            expect(names).toContain('ImplierTech')
            expect(names).toContain('ImpliedTech')
            const implied = results.find(r => r.name === 'ImpliedTech')
            expect(implied?.implied).toBe(true)
            expect(implied?.impliedBy).toBe('ImplierTech')
        })

        it('returns empty array when no technologies match', () => {
            const pageData: PageData = {
                ...basePageData,
                html: '<html><body></body></html>',
            }
            const results = service.parse(pageData)
            expect(results).toEqual([])
        })
    })
})
