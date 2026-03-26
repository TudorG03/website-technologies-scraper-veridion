import TechnologyResult from '../../interfaces/TechnologyResult'; import LoggerService from '../../logger/LoggerService'
import RawSignal from '../../types/RawSignal';
import WappalyzerTech from '../../types/WappalyzerTech'

class FingerPrintService {
    constructor(
        private logger: LoggerService,
        private technologies: Record<string, WappalyzerTech>
    ) { }

    fingerprint(signals: RawSignal[]): TechnologyResult[] {
        throw new Error('not implemented')
    }
}
