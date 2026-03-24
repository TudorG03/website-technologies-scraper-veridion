import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'
import * as cheerio from 'cheerio'

class MetaTagExtractor implements IExtractor {
    extract(pageData: PageData): RawSignal[] {
        const $ = cheerio.load(pageData.html)
        const metaTags: RawSignal[] = []

        $('meta').each((_, tag) => {
            const key = $(tag).attr('name')
            const value = $(tag).attr('content')
            if (key && value) {
                metaTags.push({
                    signalType: 'meta',
                    key,
                    value
                })
            }
        })

        return metaTags
    }
}

export default MetaTagExtractor
