import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'
import * as cheerio from 'cheerio'

class CssExtractor implements IExtractor {
    extract(pageData: PageData): RawSignal[] {
        const $ = cheerio.load(pageData.html)
        const cssTags: RawSignal[] = []

        $('link[rel="stylesheet"]').each((_, tag) => {
            const value = $(tag).attr('href')
            if (value) {
                cssTags.push({
                    signalType: 'css',
                    key: 'css',
                    value
                })
            }
        })

        $('style').each((_, tag) => {
            const value = $(tag).html()
            if (value) {
                cssTags.push({
                    signalType: 'css',
                    key: 'css',
                    value
                })
            }
        })

        return cssTags
    }
}

export default CssExtractor
