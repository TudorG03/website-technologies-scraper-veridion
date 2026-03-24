import HtmlPatternExtractor from '../../../../../src/services/parser/extractors/HtmlPatternExtractor'
import PageData from '../../../../../src/types/PageData';

describe('HtmlPatternExtractor', () => {
    const extractor = new HtmlPatternExtractor()

    it('returns a single RawSignal with signalType html', () => {
        const pageData: PageData = {
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            headers: {},
            html: `
                <html>
                    <body>
                        <p>Sample HTML</p>
                    </body>
                </html>`,
            cookies: [],
        }

        const result = extractor.extract(pageData);

        expect(result).toHaveLength(1)
        expect(result).toEqual(expect.arrayContaining([
            {
                signalType: 'html', key: 'html', value: `
                <html>
                    <body>
                        <p>Sample HTML</p>
                    </body>
                </html>`}
        ]))
    })
})
