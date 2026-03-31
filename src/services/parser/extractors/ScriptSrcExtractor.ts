import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'
import * as cheerio from 'cheerio'

class ScriptSrcExtractor implements IExtractor {
    extract(pageData: PageData): RawSignal[] {
        const $ = cheerio.load(pageData.html)
        const scriptSrcs: RawSignal[] = []

        $('script').each((_, tag) => {
            const value = $(tag).attr('src')
            if (value) {
                scriptSrcs.push({
                    signalType: 'scriptSrc',
                    key: 'scriptSrc',
                    value
                })
            }
        })

        return scriptSrcs
    }
}

export default ScriptSrcExtractor
