import * as fs from 'fs/promises'

import ConfigService from '../config/ConfigService'
import LoggerService from '../logger/LoggerService'
import ConcurrencyPool from '../services/concurrency/ConcurrencyPool'
import FetchService from '../services/fetch/FetchService'
import PlaywrightService from '../services/playwright/PlaywrightService'
import ParserService from '../services/parser/ParserService'
import OutputWriter from '../services/output/OutputWriter'
import IService from '../interfaces/IService'
import DomainResult from '../interfaces/DomainResult'
import TechnologyResult from '../interfaces/TechnologyResult'
import PageData from '../types/PageData'

class Orchestrator implements IService {
    constructor(
        private config: ConfigService,
        private logger: LoggerService,
        private pool: ConcurrencyPool,
        private fetchService: FetchService,
        private playwrightService: PlaywrightService,
        private parserService: ParserService,
        private outputWriter: OutputWriter
    ) { }

    async initialize(): Promise<void> {
        process.on('uncaughtException', (err) => {
            this.logger.error(`Uncaught exception: ${err.message}`)
        })

        process.on('unhandledRejection', (err) => {
            const msg = err instanceof Error ? err.message : String(err)
            this.logger.error(`Unhandled rejection: ${msg}`)
        })

        await this.fetchService.initialize()
        await this.playwrightService.initialize()
        await this.parserService.initialize()
        await this.outputWriter.initialize()

        this.logger.info('Orchestrator initialized')
    }

    async cleanup(): Promise<void> {
        await this.outputWriter.cleanup()
        await this.parserService.cleanup()
        await this.playwrightService.cleanup()
        await this.fetchService.cleanup()

        this.logger.info('Orchestrator cleanup complete')
    }

    async run(): Promise<void> {
        const raw = await fs.readFile(this.config.getInputFile(), 'utf-8')
        const domains = raw.split('\n').map(d => d.trim()).filter(Boolean)

        this.logger.info(`Processing ${domains.length} domains`)

        const results = await this.pool.run(
            domains,
            this.config.getConcurrencyFetch(),
            (domain) => this.processDomain(domain)
        )

        const failed = results
            .filter(r => r.status === 'failed')
            .map(r => r.domain)

        if (failed.length > 0) {
            this.logger.info(`Retrying ${failed.length} failed domains`)

            await this.pool.run(
                failed,
                this.config.getConcurrencyFetch(),
                (domain) => this.processDomain(domain)
            )
        }

        this.logger.info('Run complete')
    }

    private async processDomain(domain: string): Promise<DomainResult> {
        try {
            const pageData = await this.fetchService.fetch(domain)
            let technologies = this.parserService.parse(pageData)

            if (this.isCSR(pageData, technologies)) {
                this.logger.debug(`CSR detected for ${domain}, falling back to Playwright`)
                const playwrightData = await this.playwrightService.fetch(domain)
                technologies = this.parserService.parse(playwrightData)

                const result = this.buildResult(domain, playwrightData, technologies, 'success')
                await this.outputWriter.write(result)
                return result
            }

            const result = this.buildResult(domain, pageData, technologies, 'success')
            await this.outputWriter.write(result)
            return result

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            this.logger.warn(`Failed to process ${domain}: ${msg}`)

            const result: DomainResult = {
                domain,
                finalUrl: '',
                status: 'failed',
                technologies: [],
                crawledAt: new Date().toISOString()
            }

            await this.outputWriter.write(result)
            return result
        }
    }

    private isCSR(pageData: PageData, technologies: TechnologyResult[]): boolean {
        if (technologies.length === 0) return true
        return /<div\s+id=["'](root|app)["']\s*>\s*<\/div>/i.test(pageData.html)
    }

    private buildResult(
        domain: string,
        pageData: PageData,
        technologies: TechnologyResult[],
        status: 'success' | 'failed'
    ): DomainResult {
        return {
            domain,
            finalUrl: pageData.finalUrl,
            status,
            technologies,
            crawledAt: new Date().toISOString()
        }
    }
}

export default Orchestrator
