import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'

class JsExtractor implements IExtractor {
    constructor(private paths: string[]) { }

    extract(pageData: PageData): RawSignal[] {
        const jsTags: RawSignal[] = []

        if (pageData.jsGlobals !== undefined) {
            for (const path of this.paths) {
                let current: unknown = pageData.jsGlobals

                for (const segment of path.split('.')) {
                    if (typeof current !== 'object' || current === null) {
                        current = undefined
                        break
                    }
                    current = (current as Record<string, unknown>)[segment]
                }

                if (current !== undefined && current !== null) {
                    jsTags.push({
                        signalType: 'js',
                        key: path,
                        value: String(current)
                    })
                }
            }
        }

        return jsTags
    }
}

export default JsExtractor
