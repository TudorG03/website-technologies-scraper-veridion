import ConfigService from "../../config/ConfigService"; import IService from "../../interfaces/IService";
import LoggerService from "../../logger/LoggerService";
import PageData from "../../types/PageData";

class FetchService implements IService {
    constructor(
        private config: ConfigService,
        private logger: LoggerService
    ) { }

    async initialize(): Promise<void> { }

    async cleanup(): Promise<void> { }

    async fetch(url: string): Promise<PageData> {
        const normalizedUrl = 'https://' + url

        for (let i = 0; i < this.config.getMaxRetries(); i++) {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), this.config.getRequestTimeoutMs())

            this.logger.debug(`Fetching ${normalizedUrl} (attempt ${i + 1}/${this.config.getMaxRetries()})`)

            try {
                const response = await fetch(normalizedUrl, { signal: controller.signal })
                clearTimeout(timer)

                const statusCode = response.status

                if (statusCode >= 200 && statusCode < 300) {
                    const headers: Record<string, string> = {}

                    for (const [header, headerValue] of response.headers) {
                        headers[header] = headerValue
                    }

                    this.logger.debug(`Fetched ${normalizedUrl} → ${response.url}`)

                    return {
                        url: normalizedUrl,
                        finalUrl: response.url,
                        headers,
                        html: await response.text(),
                        cookies: response.headers.getSetCookie()
                    }
                }

                if (statusCode >= 400 && statusCode < 500) {
                    this.logger.warn(`HTTP ${statusCode} for ${normalizedUrl}, not retrying`)
                    throw new Error(`Status code ${statusCode}: ${normalizedUrl}`)
                }

                if (statusCode >= 500) {
                    this.logger.warn(`HTTP ${statusCode} for ${normalizedUrl}, retrying (attempt ${i + 1}/${this.config.getMaxRetries()})`)
                    continue
                }

            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    this.logger.warn(`Timeout after ${this.config.getRequestTimeoutMs()}ms for ${normalizedUrl}`)
                    throw new Error(`Request timed out: ${normalizedUrl}`)
                }

                throw error
            }
        }

        this.logger.error(`Max retries (${this.config.getMaxRetries()}) exceeded for ${normalizedUrl}`)
        throw new Error(`Max Retries exceeded: ${this.config.getMaxRetries()}`)
    }
}

export default FetchService
