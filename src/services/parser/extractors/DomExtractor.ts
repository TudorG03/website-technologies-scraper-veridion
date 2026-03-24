import IExtractor from '../../../interfaces/IExtractor'
import DomPattern from '../../../types/DomPattern'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'
import * as cheerio from 'cheerio'

class DomExtractor implements IExtractor {
    constructor(private patterns: Record<string, DomPattern>) { }

    extract(pageData: PageData): RawSignal[] {
        const $ = cheerio.load(pageData.html)
        const domTags: RawSignal[] = []

        for (const [selector, pattern] of Object.entries(this.patterns)) {
            $(selector).each((_, tag) => {
                let rawSignal: RawSignal = {
                    signalType: 'dom',
                    key: selector,
                    value: ''
                }

                if (pattern.exists !== undefined) {
                    domTags.push(rawSignal)
                }

                if (pattern.attributes !== undefined) {
                    for (const [attribute, attributeValue] of Object.entries(pattern.attributes)) {
                        const regexPart = attributeValue.split('\\;')[0]
                        try {
                            const regex = RegExp(regexPart, 'i');
                            const value = $(tag).attr(attribute)
                            if (value && regex.test(value)) {
                                rawSignal = { ...rawSignal, value }
                                domTags.push(rawSignal)
                            }
                        } catch (error) {
                            // silent skip
                        }
                    }
                }

                if (pattern.text !== undefined) {
                    const regexPart = pattern.text.split('\\;')[0]
                    try {
                        const regex = RegExp(regexPart, 'i')
                        const value = $(tag).text()
                        if (value && regex.test(value)) {
                            rawSignal = { ...rawSignal, value }
                            domTags.push(rawSignal)
                        }
                    } catch (error) {
                        // silent skip
                    }
                }
            })
        }

        return domTags
    }
}

export default DomExtractor
