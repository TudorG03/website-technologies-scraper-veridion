import CookieExtractor from '../../../../../src/services/parser/extractors/CookieExtractor'
import PageData from '../../../../../src/types/PageData';

describe('CookieExtractor', () => {
    const extractor = new CookieExtractor()

    it('returns a RawSignal list with signalType cookie', () => {
        const pageData: PageData = {
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            headers: {},
            html: '',
            cookies: ['cookie1=value1', 'cookie2=value=2'],
        }

        const result = extractor.extract(pageData);

        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'cookie', key: 'cookie1', value: 'value1' },
            { signalType: 'cookie', key: 'cookie2', value: 'value=2' },
        ]))
    })
})
