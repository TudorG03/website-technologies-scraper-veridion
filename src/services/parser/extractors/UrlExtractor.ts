import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'

class UrlExtractor implements IExtractor {
    extract(pageData: PageData): RawSignal[] {
        return [{
            signalType: 'url',
            key: 'url',
            value: pageData.url
        }]
    }
}

export default UrlExtractor
