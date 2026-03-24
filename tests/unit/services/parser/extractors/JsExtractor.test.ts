import JsExtractor from '../../../../../src/services/parser/extractors/JsExtractor'
import PageData from '../../../../../src/types/PageData'

describe('JsExtractor', () => {
    const paths = ['jQuery.fn.jquery', 'wp.ajax', 'nonExistent.path']
    const extractor = new JsExtractor(paths)

    const basePageData: PageData = {
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        headers: {},
        html: '',
        cookies: []
    }

    it('resolves nested dot-path keys from jsGlobals', () => {
        const pageData: PageData = {
            ...basePageData,
            jsGlobals: {
                jQuery: { fn: { jquery: '3.6.0' } },
                wp: { ajax: 'https://example.com/wp-admin/admin-ajax.php' },
                nonExistent: { wrong: 'path' }
            }
        }

        const result = extractor.extract(pageData)

        expect(result).toHaveLength(2)
        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'js', key: 'jQuery.fn.jquery', value: '3.6.0' },
            { signalType: 'js', key: 'wp.ajax', value: 'https://example.com/wp-admin/admin-ajax.php' }
        ]))
    })

    it('returns an empty array when jsGlobals is absent', () => {
        const result = extractor.extract(basePageData)
        expect(result).toHaveLength(0)
    })

    it('skips paths that do not exist in jsGlobals', () => {
        const pageData: PageData = {
            ...basePageData,
            jsGlobals: { jQuery: { fn: { jquery: '3.6.0' } } }
        }

        const result = extractor.extract(pageData)

        expect(result).toHaveLength(1)
        expect(result[0].key).toBe('jQuery.fn.jquery')
        expect(result[0].value).toBe('3.6.0')
    })
})
