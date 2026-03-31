import MetaTagExtractor from '../../../../../src/services/parser/extractors/MetaTagExtractor'
import PageData from '../../../../../src/types/PageData';

describe('MetaTagExtractor', () => {
    const extractor = new MetaTagExtractor()

    it('returns a RawSignal list with signalType meta', () => {
        const pageData: PageData = {
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            headers: {},
            html: `
                <html>
                    <head>
                        <meta name="generator" content = "WordPress 6.4">
                        <meta name="description" content = "My site">
                        <meta property="og:title" content="My site">
                    </head>
                </html>`,
            cookies: [],
        }

        const result = extractor.extract(pageData);

        expect(result).toHaveLength(2)
        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'meta', key: 'generator', value: 'WordPress 6.4' },
            { signalType: 'meta', key: 'description', value: 'My site' },
        ]))
    })
})
