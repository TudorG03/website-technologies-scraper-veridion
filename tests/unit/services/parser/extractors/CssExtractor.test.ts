import CssExtractor from '../../../../../src/services/parser/extractors/CssExtractor'
import PageData from '../../../../../src/types/PageData';

describe('CssExtractor', () => {
    const extractor = new CssExtractor()

    it('returns a RawSignal list with signalType css', () => {
        const pageData: PageData = {
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            headers: {},
            html: `
                <html>
                    <head>
                        <link rel="stylesheet" href="/wp-content/themes/main.css">
                        <link rel="stylesheet" href="https://cdn.example.com/bootstrap.css">
                        <link rel="icon" href="/favicon.ico">
                        <style>body { font-family: Arial; }</style>
                    </head>
                </html>`,
            cookies: [],
        }

        const result = extractor.extract(pageData);

        expect(result).toHaveLength(3)
        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'css', key: 'css', value: '/wp-content/themes/main.css' },
            { signalType: 'css', key: 'css', value: 'https://cdn.example.com/bootstrap.css' },
            { signalType: 'css', key: 'css', value: 'body { font-family: Arial; }' }
        ]))
    })
})
