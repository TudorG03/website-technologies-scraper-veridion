import ScriptExtractor from '../../../../../src/services/parser/extractors/ScriptsExtractor'
import PageData from '../../../../../src/types/PageData';

describe('ScriptsExtractor', () => {
    const extractor = new ScriptExtractor()

    it('returns a RawSignal list with signalType scripts', () => {
        const pageData: PageData = {
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            headers: {},
            html: `
                <html>
                    <body>
                        <script>var x = 1;</script>
                        <script>console.log('hello')</script>
                        <script src="/jquery.js"></script>
                    </body>
                </html>`,
            cookies: [],
        }

        const result = extractor.extract(pageData);

        expect(result).toHaveLength(2)
        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'scripts', key: 'scripts', value: "var x = 1;" },
            { signalType: 'scripts', key: 'scripts', value: "console.log('hello')" },
        ]))
    })
})


