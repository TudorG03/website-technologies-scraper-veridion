import Evidence from '../../interfaces/Evidence'
import TechnologyResult from '../../interfaces/TechnologyResult'
import LoggerService from '../../logger/LoggerService'
import RawSignal from '../../types/RawSignal'
import SignalType from '../../types/SignalType'
import WappalyzerTech, { WappalyzerDomSpec } from '../../types/WappalyzerTech'
import { parsePattern, applyPattern } from './patternUtils'

interface TechAccumulator {
    evidence: Evidence[],
    confidence: number,
    implied: boolean,
    impliedBy: string | undefined
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

        this.resolveImplies(results)

        const technologyResults: TechnologyResult[] = []

        results.forEach((acc, techName) => {
            if (acc.confidence >= 50) {
                technologyResults.push({
                    name: techName,
                    wappalyzerReference: this.technologies[techName].website ?? '',
                    evidence: acc.evidence,
                    confidence: acc.confidence,
                    implied: acc.implied,
                    impliedBy: acc.impliedBy
                })
            }
        })

        return technologyResults
    }

    private matchTechnology(technology: WappalyzerTech, signals: RawSignal[]): TechAccumulator {
        const list = this.matchListFields(technology, signals)
        const map = this.matchMapFields(technology, signals)
        const dom = this.matchDomFields(technology, signals)

        return {
            evidence: [...list.evidence, ...map.evidence, ...dom.evidence],
            confidence: Math.min(100, list.confidence + map.confidence + dom.confidence),
            implied: false,
            impliedBy: undefined
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
            confidence,
            implied: false,
            impliedBy: undefined
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
                            evidence.push(this.buildEvidence(signal, signalType, pattern, result.version))
                            confidence = Math.min(100, confidence + parsed.confidence)
                        }
                    }
                }
            }
        }

        return {
            evidence,
            confidence,
            implied: false,
            impliedBy: undefined
        }
    }

    private matchDomFields(technology: WappalyzerTech, signals: RawSignal[]): TechAccumulator {
        const evidence: Evidence[] = []
        let confidence = 0

        if (!technology.dom) {
            return {
                evidence,
                confidence,
                implied: false,
                impliedBy: undefined
            }
        }

        const domSignals = signals.filter(s => s.signalType === 'dom')

        if (typeof technology.dom === 'string' || Array.isArray(technology.dom)) {
            const selectors = Array.isArray(technology.dom) ? technology.dom : [technology.dom]

            for (const selector of selectors) {
                const parsed = parsePattern(selector)
                if (!parsed) continue
                const rawSelector = selector.split('\\;')[0]

                for (const signal of domSignals.filter(s => s.key === rawSelector)) {
                    evidence.push(this.buildEvidence(signal, 'dom', selector))
                    confidence = Math.min(100, confidence + parsed.confidence)
                }
            }
        } else {
            for (const [selector, spec] of Object.entries(technology.dom as Record<string, WappalyzerDomSpec>)) {
                const matching = domSignals.filter(s => s.key === selector)

                for (const signal of matching) {
                    const isExistsOnly = spec.exists !== undefined || (spec.text === undefined && spec.attributes === undefined)

                    if (isExistsOnly) {
                        const parsed = parsePattern(spec.exists ?? '')
                        if (parsed) {
                            evidence.push(this.buildEvidence(signal, 'dom', selector))
                            confidence = Math.min(100, confidence + parsed.confidence)
                        }
                    }

                    if (spec.text !== undefined) {
                        const parsed = parsePattern(spec.text)
                        if (parsed) {
                            const result = applyPattern(parsed, signal.value)
                            if (result.matched) {
                                evidence.push(this.buildEvidence(signal, 'dom', spec.text, result.version))
                                confidence = Math.min(100, confidence + parsed.confidence)
                            }
                        }
                    }

                    if (spec.attributes !== undefined) {
                        for (const [, pattern] of Object.entries(spec.attributes)) {
                            const parsed = parsePattern(pattern)
                            if (parsed) {
                                const result = applyPattern(parsed, signal.value)
                                if (result.matched) {
                                    evidence.push(this.buildEvidence(signal, 'dom', pattern, result.version))
                                    confidence = Math.min(100, confidence + parsed.confidence)
                                }
                            }
                        }
                    }
                }
            }
        }

        return {
            evidence,
            confidence,
            implied: false,
            impliedBy: undefined
        }
    }

    private resolveImplies(computedTechnologies: Map<string, TechAccumulator>): void {
        let found = true

        while (found) {
            found = false
            for (const technologyName of computedTechnologies.keys()) {
                const impliesField = this.technologies[technologyName]?.implies;

                if (impliesField === undefined) {
                    continue
                }

                const impliesArray = Array.isArray(impliesField) ? impliesField : [impliesField]

                const implierConfidence = computedTechnologies.get(technologyName)?.confidence

                if (implierConfidence !== undefined && implierConfidence < 50) {
                    continue
                }

                if (impliesArray && impliesArray.length > 0) {
                    for (const impliedTechnology of impliesArray) {
                        let confidence = 100
                        const impliedTechnologyParts = impliedTechnology?.split('\\;')

                        if (impliedTechnologyParts &&
                            !computedTechnologies.has(impliedTechnologyParts[0]) &&
                            this.technologies[impliedTechnologyParts[0]]) {
                            for (const part of impliedTechnologyParts) {
                                if (part.startsWith('confidence')) {
                                    confidence = parseInt(part.split(':')[1])
                                }
                            }

                            if (confidence >= 50) {
                                found = true
                                computedTechnologies.set(
                                    impliedTechnologyParts[0],
                                    {
                                        evidence: [],
                                        confidence,
                                        implied: true,
                                        impliedBy: technologyName
                                    }
                                )
                            }
                        }
                    }
                }
            }
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
