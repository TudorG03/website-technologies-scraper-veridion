import UrlExtractor from '../../../../../src/services/parser/extractors/UrlExtractor'
import PageData from '../../../../../src/types/PageData'

describe('UrlExtractor', () => {
    const extractor = new UrlExtractor()

    it('returns a single RawSignal with signalType url', () => {
        const pageData: PageData = {
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            headers: {},
            html: '',
            cookies: [],
        }

        const result = extractor.extract(pageData);

        expect(result).toHaveLength(1)
        expect(result[0].signalType).toBe('url')
        expect(result[0].key).toBe('url')
        expect(result[0].value).toBe('https://example.com')
    })
})
