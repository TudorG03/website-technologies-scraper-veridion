import ExtractorRegistry from '../../../../../src/services/parser/extractors/ExtractorRegistry'
import UrlExtractor from '../../../../../src/services/parser/extractors/UrlExtractor'
import HeaderExtractor from '../../../../../src/services/parser/extractors/HeaderExtractor'
import PageData from '../../../../../src/types/PageData'

describe('ExtractorRegistry', () => {
    const registry = new ExtractorRegistry([
        new UrlExtractor(),
        new HeaderExtractor()
    ])

    const pageData: PageData = {
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        headers: { 'server': 'nginx' },
        html: '',
        cookies: []
    }

    it('merges signals from all extractors into a single flat array', () => {
        const result = registry.extract(pageData)

        expect(result).toHaveLength(2)
        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'url', key: 'url', value: 'https://example.com' },
            { signalType: 'header', key: 'server', value: 'nginx' }
        ]))
    })

    it('returns an empty array when no extractors are registered', () => {
        const emptyRegistry = new ExtractorRegistry([])
        const result = emptyRegistry.extract(pageData)
        expect(result).toHaveLength(0)
    })
})
