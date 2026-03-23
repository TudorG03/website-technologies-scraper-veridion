import RawSignal from '../types/RawSignal'
import PageData from '../types/PageData'

interface IExtractor {
  extract(pageData: PageData): RawSignal[]
}

export default IExtractor
