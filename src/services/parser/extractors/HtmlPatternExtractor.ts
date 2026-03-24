import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'

class HtmlPatternExtractor implements IExtractor {
    extract(pageData: PageData): RawSignal[] {
        return [{
            signalType: 'html',
            key: 'html',
            value: pageData.html
        }]
    }
}

export default HtmlPatternExtractor
