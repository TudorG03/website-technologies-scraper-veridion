import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'

class HeaderExtractor implements IExtractor {
    extract(pageData: PageData): RawSignal[] {
        const headers: RawSignal[] = []

        for (const [key, value] of Object.entries(pageData.headers)) {
            headers.push({
                signalType: 'header',
                key: key.toLowerCase(),
                value: value
            })
        }

        return headers
    }
}

export default HeaderExtractor
