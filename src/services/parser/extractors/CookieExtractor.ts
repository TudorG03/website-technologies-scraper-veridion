import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'

class CookieExtractor implements IExtractor {
    extract(pageData: PageData): RawSignal[] {
        return pageData.cookies.map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return {
                signalType: 'cookie',
                key: name,
                value: rest.join('=')
            } as RawSignal
        })
    }
}

export default CookieExtractor
