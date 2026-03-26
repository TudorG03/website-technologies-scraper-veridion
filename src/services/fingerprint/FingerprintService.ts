import { version } from 'node:punycode'; import Evidence from '../../interfaces/Evidence'
import TechnologyResult from '../../interfaces/TechnologyResult'
import LoggerService from '../../logger/LoggerService'
import RawSignal from '../../types/RawSignal'
import SignalType from '../../types/SignalType'
import WappalyzerTech from '../../types/WappalyzerTech'
import { parsePattern, applyPattern } from './patternUtils'

interface TechAccumulator {
    evidence: Evidence[],
    confidence: number
}

class FingerprintService {
    constructor(
        private logger: LoggerService,
        private technologies: Record<string, WappalyzerTech>
    ) { }

    fingerprint(signals: RawSignal[]): TechnologyResult[] {
        const results = new Map<string, TechAccumulator>()
        for (const [technologyKey, technologyVal] of Object.entries(this.technologies)) {
            const accumulator = this.matchTechnology(technologyVal, signals)
            if (accumulator.evidence.length > 0) {
                results.set(technologyKey, accumulator)
            }
        }

        const technologyResults: TechnologyResult[] = []

        results.forEach((acc, techName) => {
            if (acc.confidence >= 50) {
                technologyResults.push({
                    name: techName,
                    wappalyzerReference: this.technologies[techName].website ?? '',
                    evidence: acc.evidence,
                    confidence: acc.confidence,
                    implied: false,
                    impliedBy: undefined
                })
            }
        })

        return technologyResults
    }

    private matchTechnology(technology: WappalyzerTech, signals: RawSignal[]): TechAccumulator {
        const list = this.matchListFields(technology, signals)
        const map = this.matchMapFields(technology, signals)

        return {
            evidence: [...list.evidence, ...map.evidence],
            confidence: Math.min(100, list.confidence + map.confidence)
        }
    }

    private matchListFields(technology: WappalyzerTech, signals: RawSignal[]): TechAccumulator {
        const listFields: Array<[string | string[] | undefined, SignalType]> = [
            [technology.scriptSrc, 'scriptSrc'],
            [technology.scripts, 'scripts'],
            [technology.html, 'html'],
            [technology.css, 'css'],
            [technology.url, 'url'],
        ]

        const evidence: Evidence[] = []
        let confidence = 0

        for (const [field, signalType] of listFields) {
            if (!field) continue
            const patterns = Array.isArray(field) ? field : [field]
            const typeSignals = signals.filter(s => s.signalType === signalType)

            for (const pattern of patterns) {
                const parsed = parsePattern(pattern)
                if (!parsed) continue

                for (const signal of typeSignals) {
                    const result = applyPattern(parsed, signal.value)
                    if (result.matched) {
                        evidence.push(this.buildEvidence(signal, signalType, pattern, result.version))
                        confidence = Math.min(100, confidence + parsed.confidence)
                    }
                }
            }
        }

        return {
            evidence,
            confidence
        }
    }

    private matchMapFields(technology: WappalyzerTech, signals: RawSignal[]): TechAccumulator {
        const mapFields: Array<[Record<string, string | string[]> | undefined, SignalType]> = [
            [technology.headers, 'header'],
            [technology.meta, 'meta'],
            [technology.cookies, 'cookie'],
            [technology.js, 'js'],
        ]

        const evidence: Evidence[] = []
        let confidence = 0

        for (const [field, signalType] of mapFields) {
            if (!field) continue

            for (const [key, patterns] of Object.entries(field)) {
                const normalizedKey = signalType === 'header' ? key.toLowerCase() : key
                const patternsArr = Array.isArray(patterns) ? patterns : [patterns]
                const keySignals = signals.filter(s => {
                    const signalKey = signalType === 'header' ? s.key.toLowerCase() : s.key
                    return s.signalType === signalType && signalKey === normalizedKey
                })

                for (const pattern of patternsArr) {
                    const parsed = parsePattern(pattern)
                    if (!parsed) continue

                    for (const signal of keySignals) {
                        const result = applyPattern(parsed, signal.value)
                        if (result.matched) {
                            evidence.push(this.buildEvidence(signal, signalType, pattern, version))
                            confidence = Math.min(100, confidence + parsed.confidence)
                        }
                    }
                }
            }
        }

        return {
            evidence,
            confidence
        }
    }

    private buildEvidence(signal: RawSignal, signalType: SignalType, pattern: string, version?: string): Evidence {
        return {
            signalType,
            key: signal.key,
            value: signal.value,
            regex: pattern.split('\\;')[0],
            version
        }
    }
}

export default FingerprintService
