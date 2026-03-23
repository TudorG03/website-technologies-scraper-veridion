import Evidence from './Evidence'

interface TechnologyResult {
    name: string
    wappalyzerReference: string
    evidence: Evidence[]
    confidence: number
    implied: boolean
    impliedBy?: string
}

export default TechnologyResult
