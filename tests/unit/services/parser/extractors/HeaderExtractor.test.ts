import HeaderExtractor from '../../../../../src/services/parser/extractors/HeaderExtractor'
import PageData from '../../../../../src/types/PageData';

describe('HeaderExtractor', () => {
    const extractor = new HeaderExtractor()

    it('returns a RawSignal list with signalType header', () => {
        const pageData: PageData = {
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            headers: {
                'Content-Type': 'text/html',
                'X-Powered-By': 'Express',
                'Server': 'nginx'
            },
            html: '',
            cookies: [],
        }

        const result = extractor.extract(pageData);

        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'header', key: 'content-type', value: 'text/html' },
            { signalType: 'header', key: 'x-powered-by', value: 'Express' },
            { signalType: 'header', key: 'server', value: 'nginx' },
        ]))
    })
})
