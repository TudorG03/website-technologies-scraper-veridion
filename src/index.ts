import ConfigService from './config/ConfigService'
import LoggerService from './logger/LoggerService'
import ConcurrencyPool from './services/concurrency/ConcurrencyPool'
import FetchService from './services/fetch/FetchService'
import PlaywrightService from './services/playwright/PlaywrightService'
import ParserService from './services/parser/ParserService'
import OutputWriter from './services/output/OutputWriter'
import Orchestrator from './orchestrator/Orchestrator'

async function main(): Promise<void> {
    const config = new ConfigService()
    const logger = new LoggerService(config)
    const pool = new ConcurrencyPool()
    const fetchService = new FetchService(config, logger)
    const playwrightService = new PlaywrightService(config, logger)
    const parserService = new ParserService(logger, config)
    const outputWriter = new OutputWriter(config, logger)

    const orchestrator = new Orchestrator(
        config,
        logger,
        pool,
        fetchService,
        playwrightService,
        parserService,
        outputWriter
    )

    await orchestrator.initialize()

    try {
        await orchestrator.run()
    } finally {
        await orchestrator.cleanup()
    }
}

main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})
