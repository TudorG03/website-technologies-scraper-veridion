import fs from 'fs'
import ConfigService from "../../config/ConfigService"; import DomainResult from "../../interfaces/DomainResult";
import IService from "../../interfaces/IService";
import LoggerService from "../../logger/LoggerService";

class OutputWriter implements IService {
    private hasWritten: boolean = false
    private writeQueue: Promise<void> = Promise.resolve()

    constructor(
        private config: ConfigService,
        private logger: LoggerService
    ) { }

    async initialize(): Promise<void> { }

    async cleanup(): Promise<void> {
        await this.writeQueue
        await fs.promises.appendFile(this.config.getOutputFile(), '\n]')
        this.logger.debug(`Output finalized: ${this.config.getOutputFile()}`)
    }

    async write(result: DomainResult): Promise<void> {
        this.writeQueue = this.writeQueue.then(() => this.doWrite(result))
        return this.writeQueue
    }

    private async doWrite(result: DomainResult): Promise<void> {
        const json = JSON.stringify(result, null, 2)

        if (!this.hasWritten) {
            await fs.promises.writeFile(this.config.getOutputFile(), '[\n' + json)
            this.hasWritten = true
        } else {
            await fs.promises.appendFile(this.config.getOutputFile(), ',\n' + json)
        }

        this.logger.debug(`Written result for ${result.domain}`)
    }
}

export default OutputWriter
