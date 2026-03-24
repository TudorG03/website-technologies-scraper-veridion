import ScriptSrcExtractor from '../../../../../src/services/parser/extractors/ScriptSrcExtractor'
import PageData from '../../../../../src/types/PageData';

describe('ScriptSrcExtractor', () => {
    const extractor = new ScriptSrcExtractor()

    it('returns a RawSignal list with signalType scriptSrc', () => {
        const pageData: PageData = {
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            headers: {},
            html: `
                <html>
                    <body>
                        <script src="/wp-includes/js/jquery.js"></script>
                        <script src="https://cdn.example.com/react.min.js"></script>
                        <script>console.log('inline script')</script>
                    </body>
                </html>`,
            cookies: [],
        }

        const result = extractor.extract(pageData);

        expect(result).toHaveLength(2)
        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'scriptSrc', key: 'scriptSrc', value: '/wp-includes/js/jquery.js' },
            { signalType: 'scriptSrc', key: 'scriptSrc', value: 'https://cdn.example.com/react.min.js' },
        ]))
    })
})

