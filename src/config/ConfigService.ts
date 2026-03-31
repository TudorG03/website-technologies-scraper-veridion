import * as dotenv from 'dotenv'

dotenv.config();

class ConfigService {

    constructor() { }

    getConcurrencyFetch(): number {
        return parseInt(this.get('CONCURRENCY_FETCH'))
    }

    getConcurrencyPlaywright(): number {
        return parseInt(this.get('CONCURRENCY_PLAYWRIGHT'))
    }

    getRequestTimeoutMs(): number {
        return parseInt(this.get('REQUEST_TIMEOUT_MS'))
    }

    getMaxRetries(): number {
        return parseInt(this.get('MAX_RETRIES'))
    }

    getLogLevel(): string {
        return this.get("LOG_LEVEL")
    }

    getLogOutput(): string {
        return this.get("LOG_OUTPUT")
    }

    getLogFile(): string {
        return this.get("LOG_FILE")
    }

    getInputFile(): string {
        return this.get("INPUT_FILE")
    }

    getOutputFile(): string {
        return this.get("OUTPUT_FILE")
    }

    getTechnologiesDir(): string {
        return this.get("TECHNOLOGIES_DIR")
    }

    private get(key: string): string {
        const value = process.env[key]
        if (value === undefined) {
            throw new Error(`Missing required environment variable: ${key}`)
        }
        return value
    }
}

export default ConfigService
