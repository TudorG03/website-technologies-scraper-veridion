import ConfigService from "../../config/ConfigService"; import IService from "../../interfaces/IService";
import LoggerService from "../../logger/LoggerService";
import {
    Browser,
    chromium
} from 'playwright'
import PageData from "../../types/PageData";

class PlaywrightService implements IService {
    private static readonly BROWSER_BUILTINS = new Set([
        // Global object references
        'window', 'self', 'top', 'parent', 'frames', 'globalThis',
        // DOM
        'document', 'screen', 'visualViewport',
        // Navigation
        'location', 'history', 'navigation',
        // Browser APIs
        'navigator', 'performance', 'crypto', 'fetch', 'cache',
        'indexedDB', 'sessionStorage', 'localStorage', 'cookieStore',
        'caches', 'serviceWorker', 'worklet',
        // Timers
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'setImmediate', 'clearImmediate', 'requestAnimationFrame',
        'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
        'queueMicrotask',
        // UI
        'alert', 'confirm', 'prompt', 'print', 'open', 'close', 'focus', 'blur',
        'scroll', 'scrollTo', 'scrollBy', 'resizeTo', 'resizeBy', 'moveTo', 'moveBy',
        'stop', 'postMessage', 'getSelection', 'find',
        // Events
        'addEventListener', 'removeEventListener', 'dispatchEvent',
        'onload', 'onerror', 'onunload', 'onbeforeunload', 'onmessage',
        'onmessageerror', 'onhashchange', 'onpopstate', 'onstorage',
        // Constructors / classes (built-in globals)
        'Object', 'Array', 'Function', 'Boolean', 'Number', 'String', 'Symbol',
        'BigInt', 'Math', 'Date', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap',
        'WeakSet', 'WeakRef', 'Promise', 'Proxy', 'Reflect', 'JSON', 'Intl',
        'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Atomics',
        'Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array',
        'Uint8Array', 'Uint16Array', 'Uint32Array', 'Uint8ClampedArray',
        'BigInt64Array', 'BigUint64Array',
        'Iterator', 'Generator', 'GeneratorFunction', 'AsyncGenerator',
        'AsyncGeneratorFunction', 'AsyncFunction',
        // Web APIs - constructors
        'Event', 'EventTarget', 'AbortController', 'AbortSignal',
        'XMLHttpRequest', 'XMLHttpRequestEventTarget', 'XMLHttpRequestUpload',
        'WebSocket', 'Worker', 'SharedWorker', 'Blob', 'File', 'FileReader',
        'FileList', 'FormData', 'Headers', 'Request', 'Response', 'URL',
        'URLSearchParams', 'ReadableStream', 'WritableStream', 'TransformStream',
        'TextEncoder', 'TextDecoder', 'TextDecoderStream', 'TextEncoderStream',
        'CompressionStream', 'DecompressionStream',
        'MutationObserver', 'IntersectionObserver', 'ResizeObserver',
        'PerformanceObserver', 'ReportingObserver',
        'CustomEvent', 'MessageEvent', 'MessageChannel', 'MessagePort',
        'BroadcastChannel', 'EventSource', 'WebTransport',
        'HTMLElement', 'SVGElement', 'Element', 'Node', 'NodeList',
        'Document', 'DocumentFragment', 'ShadowRoot', 'Range', 'Selection',
        'Audio', 'Image', 'Option', 'Worker',
        'Canvas', 'CanvasRenderingContext2D', 'Path2D', 'ImageData', 'ImageBitmap',
        'WebGLRenderingContext', 'WebGL2RenderingContext',
        'IDBFactory', 'IDBDatabase', 'IDBTransaction', 'IDBObjectStore',
        'Notification', 'Geolocation', 'MediaDevices',
        'RTCPeerConnection', 'RTCSessionDescription', 'RTCIceCandidate',
        // Misc
        'console', 'undefined', 'NaN', 'Infinity',
        'isNaN', 'isFinite', 'parseInt', 'parseFloat',
        'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
        'escape', 'unescape', 'eval', 'atob', 'btoa',
        'structuredClone', 'reportError',
        // Chrome-specific / DevTools
        'chrome', 'webkitURL', 'webkitStorageInfo', 'openDatabase',
    ])

    private browser!: Browser

    constructor(
        private config: ConfigService,
        private logger: LoggerService
    ) { }

    async initialize(): Promise<void> {
        this.browser = await chromium.launch()
        this.logger.debug('Playwright browser launched')
    }

    async cleanup(): Promise<void> {
        await this.browser.close()
        this.logger.debug('Playwright browser closed')
    }

    async fetch(url: string): Promise<PageData> {
        const context = await this.browser.newContext()
        const page = await context.newPage()
        const normalizedUrl = 'https://' + url

        try {
            page.setDefaultTimeout(this.config.getRequestTimeoutMs())
            this.logger.debug(`Playwright fetching ${normalizedUrl}`)
            const response = await page.goto(normalizedUrl, { waitUntil: 'networkidle' })
            const headers: Record<string, string> = response?.headers() ?? {}
            const cookies = (await context.cookies()).map(c => `${c.name}=${c.value}`)
            const html = await page.content()
            const jsGlobals = await page.evaluate((blocklist) => {
                function capture(value: unknown, depth: number): unknown {
                    if (depth === 0) return String(value)
                    if (value === null || typeof value !== 'object') return String(value)

                    const nested: Record<string, unknown> = {}
                    for (const k of Object.keys(value as object)) {
                        try {
                            nested[k] = capture((value as Record<string, unknown>)[k], depth - 1)
                        } catch (_) { }
                    }
                    return nested
                }

                const results: Record<string, unknown> = {}
                for (const key of Object.keys(window)) {
                    if (blocklist.includes(key)) continue
                    try {
                        results[key] = capture(window[key as keyof Window], 2)
                    } catch (_) { }
                }
                return results
            }, Array.from(PlaywrightService.BROWSER_BUILTINS))

            this.logger.debug(`Playwright fetched ${normalizedUrl} → ${page.url()}`)

            return {
                url: normalizedUrl,
                finalUrl: page.url(),
                headers,
                html,
                cookies,
                jsGlobals
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Http error'
            this.logger.warn(`Playwright failed for ${normalizedUrl}: ${msg}`)
            throw new Error(msg)
        } finally {
            await page.close()
            await context.close()
        }
    }
}

export default PlaywrightService
