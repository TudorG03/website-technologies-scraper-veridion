import IExtractor from '../../../interfaces/IExtractor'
import PageData from '../../../types/PageData'
import RawSignal from '../../../types/RawSignal'

class ExtractorRegistry implements IExtractor {
    constructor(private extractors: IExtractor[]) { }

    extract(pageData: PageData): RawSignal[] {
        return this.extractors.flatMap(extractor => extractor.extract(pageData))
    }
}

export default ExtractorRegistry
