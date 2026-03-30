import ConfigService from "../../config/ConfigService"; import IService from "../../interfaces/IService";
import LoggerService from "../../logger/LoggerService";
import PageData from "../../types/PageData";

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

class FetchService implements IService {
    constructor(
        private config: ConfigService,
        private logger: LoggerService
    ) { }

    async initialize(): Promise<void> { }

    async cleanup(): Promise<void> { }

    async fetch(domain: string): Promise<PageData> {
        try {
            return await this.attemptFetch('https://' + domain)
        } catch (error) {
            if (error instanceof Error && error.message.includes('timed out')) throw error
            if (error instanceof Error && error.message.startsWith('Status code')) throw error
            this.logger.debug(`HTTPS failed for ${domain}, trying HTTP`)
            return await this.attemptFetch('http://' + domain)
        }
    }

    private async attemptFetch(url: string): Promise<PageData> {
        for (let i = 0; i < this.config.getMaxRetries(); i++) {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), this.config.getRequestTimeoutMs())

            this.logger.debug(`Fetching ${url} (attempt ${i + 1}/${this.config.getMaxRetries()})`)

            try {
                const response = await fetch(url, { signal: controller.signal, headers: BROWSER_HEADERS })
                clearTimeout(timer)

                const statusCode = response.status

                if (statusCode >= 200 && statusCode < 300) {
                    const headers: Record<string, string> = {}

                    for (const [header, headerValue] of response.headers) {
                        headers[header] = headerValue
                    }

                    this.logger.debug(`Fetched ${url} → ${response.url}`)

                    return {
                        url,
                        finalUrl: response.url,
                        headers,
                        html: await response.text(),
                        cookies: response.headers.getSetCookie()
                    }
                }

                if (statusCode >= 400 && statusCode < 500) {
                    this.logger.warn(`HTTP ${statusCode} for ${url}, not retrying`)
                    throw new Error(`Status code ${statusCode}: ${url}`)
                }

                if (statusCode >= 500) {
                    this.logger.warn(`HTTP ${statusCode} for ${url}, retrying (attempt ${i + 1}/${this.config.getMaxRetries()})`)
                    continue
                }

            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    this.logger.warn(`Timeout after ${this.config.getRequestTimeoutMs()}ms for ${url}`)
                    throw new Error(`Request timed out: ${url}`)
                }

                throw error
            }
        }

        this.logger.error(`Max retries (${this.config.getMaxRetries()}) exceeded for ${url}`)
        throw new Error(`Max Retries exceeded: ${this.config.getMaxRetries()}`)
    }
}

export default FetchService
