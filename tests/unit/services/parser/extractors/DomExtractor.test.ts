import DomExtractor from '../../../../../src/services/parser/extractors/DomExtractor'
import PageData from '../../../../../src/types/PageData'
import DomPattern from '../../../../../src/types/DomPattern'

describe('DomExtractor', () => {
    const patterns: Record<string, DomPattern> = {
        '#wpadminbar': { exists: '' },
        'link[rel="stylesheet"]': { attributes: { href: 'wp-content' } },
        'div.footer': { text: 'Powered by WordPress' }
    }

    const extractor = new DomExtractor(patterns);

    const pageData: PageData = {
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        headers: {},
        html: `
        <html>
          <head>
            <link rel="stylesheet" href="/wp-content/themes/main.css">
          </head>
          <body>
            <div id="wpadminbar">Admin bar</div>
            <div class="footer">Powered by WordPress</div>
            <div class="unrelated">Nothing here</div>
          </body>
        </html>`,
        cookies: []
    }

    it('returns signals for exists, attributes and text checks', () => {
        const result = extractor.extract(pageData)

        expect(result).toEqual(expect.arrayContaining([
            { signalType: 'dom', key: '#wpadminbar', value: '' },
            { signalType: 'dom', key: 'link[rel="stylesheet"]', value: '/wp-content/themes/main.css' },
            { signalType: 'dom', key: 'div.footer', value: 'Powered by WordPress' }
        ]))
    })

    it('returns no signal when selector is not found', () => {
        const emptyPageData = { ...pageData, html: '<html><body></body></html>' }
        const result = extractor.extract(emptyPageData)
        expect(result).toHaveLength(0)
    })
})
