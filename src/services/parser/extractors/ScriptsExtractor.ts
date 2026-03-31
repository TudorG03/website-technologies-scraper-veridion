import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'
import * as cheerio from 'cheerio'

class ScriptsExtractor implements IExtractor {
    extract(pageData: PageData): RawSignal[] {
        const $ = cheerio.load(pageData.html)
        const scriptTags: RawSignal[] = []

        $('script:not([src])').each((_, tag) => {
            const value = $(tag).text()
            if (value) {
                scriptTags.push({
                    signalType: 'scripts',
                    key: 'scripts',
                    value
                })
            }
        })

        return scriptTags
    }
}

export default ScriptsExtractor
