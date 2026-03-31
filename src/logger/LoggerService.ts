import * as winston from 'winston';
import ConfigService from '../config/ConfigService'

class LoggerService {

    private logger: winston.Logger

    constructor(private config: ConfigService) {
        const transports: winston.transport[] = []
        const output = this.config.getLogOutput();

        if (output === 'file' || output === 'both') {
            transports.push(new winston.transports.File({ filename: this.config.getLogFile() }))
        }

        if (output === 'stdout' || output === 'both') {
            transports.push(new winston.transports.Console())
        }

        this.logger = winston.createLogger({
            level: this.config.getLogLevel(),
            transports
        })
    }

    info(message: string): void {
        this.logger.info(message)
    }

    warn(message: string): void {
        this.logger.warn(message)
    }

    error(message: string): void {
        this.logger.error(message)
    }

    debug(message: string): void {
        this.logger.debug(message)
    }
}

export default LoggerService
