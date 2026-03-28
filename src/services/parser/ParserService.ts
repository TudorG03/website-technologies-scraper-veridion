import * as fs from 'fs/promises'
import * as path from 'path'

import IService from '../../interfaces/IService'
import TechnologyResult from '../../interfaces/TechnologyResult'
import ConfigService from '../../config/ConfigService'
import LoggerService from '../../logger/LoggerService'
import PageData from '../../types/PageData'
import DomPattern from '../../types/DomPattern'
import WappalyzerTech, { WappalyzerDomSpec } from '../../types/WappalyzerTech'
import FingerprintService from '../fingerprint/FingerprintService'
import ExtractorRegistry from './extractors/ExtractorRegistry'
import HeaderExtractor from './extractors/HeaderExtractor'
import MetaTagExtractor from './extractors/MetaTagExtractor'
import ScriptSrcExtractor from './extractors/ScriptSrcExtractor'
import ScriptsExtractor from './extractors/ScriptsExtractor'
import HtmlPatternExtractor from './extractors/HtmlPatternExtractor'
import CookieExtractor from './extractors/CookieExtractor'
import UrlExtractor from './extractors/UrlExtractor'
import CssExtractor from './extractors/CssExtractor'
import DomExtractor from './extractors/DomExtractor'
import JsExtractor from './extractors/JsExtractor'

class ParserService implements IService {
    private registry: ExtractorRegistry | null = null
    private fingerprintService: FingerprintService | null = null

    constructor(
        private logger: LoggerService,
        private config: ConfigService
    ) { }

    async initialize(): Promise<void> {
        const techDir = this.config.getTechnologiesDir()
        const technologies = await this.loadTechnologies(techDir)

        const domPatterns = this.buildDomPatterns(technologies)
        const jsPaths = this.collectJsPaths(technologies)

        this.registry = new ExtractorRegistry([
            new HeaderExtractor(),
            new MetaTagExtractor(),
            new ScriptSrcExtractor(),
            new ScriptsExtractor(),
            new HtmlPatternExtractor(),
            new CookieExtractor(),
            new UrlExtractor(),
            new CssExtractor(),
            new DomExtractor(domPatterns),
            new JsExtractor(jsPaths)
        ])

        this.fingerprintService = new FingerprintService(this.logger, technologies)

        this.logger.info(`ParserService initialized with ${Object.keys(technologies).length} technologies`)
    }

    async cleanup(): Promise<void> { }

    parse(pageData: PageData): TechnologyResult[] {
        if (!this.registry || !this.fingerprintService) {
            throw new Error('ParserService not initialized — call initialize() first')
        }

        const signals = this.registry.extract(pageData)
        return this.fingerprintService.fingerprint(signals)
    }

    private async loadTechnologies(techDir: string): Promise<Record<string, WappalyzerTech>> {
        const files = await fs.readdir(techDir)
        const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'categories.json')

        const technologies: Record<string, WappalyzerTech> = {}

        for (const file of jsonFiles) {
            const content = await fs.readFile(path.join(techDir, file), 'utf-8')
            const data = JSON.parse(content) as Record<string, WappalyzerTech>
            Object.assign(technologies, data)
        }

        return technologies
    }

    private buildDomPatterns(technologies: Record<string, WappalyzerTech>): Record<string, DomPattern> {
        const patterns: Record<string, DomPattern> = {}

        for (const tech of Object.values(technologies)) {
            if (!tech.dom) continue

            if (typeof tech.dom === 'string' || Array.isArray(tech.dom)) {
                const selectors = Array.isArray(tech.dom) ? tech.dom : [tech.dom]
                for (const entry of selectors) {
                    const selector = entry.split('\\;')[0]
                    if (!patterns[selector]) patterns[selector] = {}
                    patterns[selector].exists = ''
                }
            } else {
                for (const [selector, spec] of Object.entries(tech.dom as Record<string, WappalyzerDomSpec>)) {
                    if (!patterns[selector]) patterns[selector] = {}

                    if (spec.exists !== undefined || (!spec.text && !spec.attributes)) {
                        patterns[selector].exists = ''
                    }
                    if (spec.text !== undefined) {
                        patterns[selector].text = ''
                    }
                    if (spec.attributes !== undefined) {
                        if (!patterns[selector].attributes) patterns[selector].attributes = {}
                        for (const attr of Object.keys(spec.attributes)) {
                            patterns[selector].attributes![attr] = ''
                        }
                    }
                }
            }
        }

        return patterns
    }

    private collectJsPaths(technologies: Record<string, WappalyzerTech>): string[] {
        const paths = new Set<string>()

        for (const tech of Object.values(technologies)) {
            if (!tech.js) continue
            for (const key of Object.keys(tech.js)) {
                paths.add(key)
            }
        }

        return Array.from(paths)
    }
}

export default ParserService
