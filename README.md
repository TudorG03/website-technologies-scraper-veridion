# Website Technologies Scraper

A CLI tool that identifies technologies used to build websites. Given a list of domains, the tool fetches each one, extracts technology signals, matches them against Wappalyzer's pattern database, and outputs a structured JSON file with detected technologies and proof for each detection.

---

## Tech Stack

| Purpose | Library / Tool |
|---|---|
| Language | TypeScript |
| Runtime | Node.js v24 |
| HTTP Fetching | Native `fetch` (Node.js built-in) |
| Headless Browser | Playwright (Chromium) |
| HTML Parsing | Cheerio |
| Technology Patterns | `enthec/webappanalyzer` (~7,500 technologies) |
| Logging | Winston |
| Testing | Jest + ts-jest |

---

## Setup

```bash
npm install        # also downloads Wappalyzer pattern files via postinstall
npx playwright install chromium
cp .env.example .env
```

If your domain list is in Parquet format, convert it first:

```bash
python3 -m venv scripts/.venv
source scripts/.venv/bin/activate
pip install pandas pyarrow
python3 scripts/parquet_to_txt.py
```

---

## Running

```bash
npx ts-node src/index.ts
```

Results are written incrementally to `data/output/results.json` as each domain is processed. Progress and errors are logged to `logs/app.log`.

---

## Configuration

All configuration is in `.env`:

```bash
CONCURRENCY_FETCH=10        # parallel fetch workers
CONCURRENCY_PLAYWRIGHT=3    # parallel Playwright workers
REQUEST_TIMEOUT_MS=10000    # per-request timeout
MAX_RETRIES=3               # retries on 5xx responses
LOG_LEVEL=info              # debug | info | warn | error
INPUT_FILE=data/input/domains.txt
OUTPUT_FILE=data/output/results.json
```

---

## Architecture

```
Input (domains.txt)
  → Orchestrator
      → ConcurrencyPool (batch of N domains)
          → FetchService (native fetch, 4-URL fallback chain)
              → CSR detection (empty body / zero technologies)
                  → PlaywrightService (fallback for JS-rendered pages)
          → ParserService
              → ExtractorRegistry (10 signal extractors)
              → FingerprintService (pattern matching + confidence scoring)
          → OutputWriter (incremental JSON append)
```

### Signal Extractors

| Extractor | Signal | What it extracts |
|---|---|---|
| HeaderExtractor | `headers` | HTTP response headers |
| MetaTagExtractor | `meta` | `<meta>` tag name/content pairs |
| ScriptSrcExtractor | `scriptSrc` | `<script src>` URLs |
| ScriptsExtractor | `scripts` | Inline `<script>` content |
| HtmlPatternExtractor | `html` | Raw HTML patterns |
| CookieExtractor | `cookies` | `Set-Cookie` header values |
| UrlExtractor | `url` | The page URL |
| CssExtractor | `css` | CSS file URLs and inline styles |
| DomExtractor | `dom` | CSS selector queries via Cheerio |
| JsExtractor | `js` | JavaScript global variable values |

### Fetch Fallback Chain

For each domain, the fetcher tries four URL candidates in order, stopping on the first success:

1. `https://domain`
2. `http://domain`
3. `https://www.domain`
4. `http://www.domain`

Only genuine network errors advance to the next candidate. Timeouts and HTTP error codes (4xx/5xx) terminate immediately.

### CSR Detection

Playwright is triggered if either condition is met after the plain fetch:

1. Zero technologies were detected
2. The HTML contains an empty root div (`<div id="root">` or `<div id="app">` with no children)

### Output Format

```json
[
  {
    "domain": "example.com",
    "finalUrl": "https://www.example.com/",
    "status": "success",
    "crawledAt": "2026-03-31T12:00:00.000Z",
    "technologies": [
      {
        "name": "WordPress",
        "wappalyzerReference": "https://wordpress.org",
        "confidence": 100,
        "implied": false,
        "evidence": [
          {
            "signalType": "meta",
            "key": "generator",
            "value": "WordPress 6.4",
            "regex": "WordPress(?:[\\s/]([\\d.]+))?",
            "version": "6.4"
          }
        ]
      }
    ]
  }
]
```

---

## Discussion

### 1. Main Issues with the Current Implementation

**Timeout handling**
The 10-second timeout works well for most domains but fails on legitimately slow servers (large pages, slow CDNs, geographically distant hosts). A smarter approach would use adaptive timeouts — start short, back off progressively on retry — rather than a fixed cutoff.

**JS-rendered pages**
The Playwright fallback only triggers when zero technologies are found or an empty root div is detected. Pages that are partially server-rendered but load key technology signals via JavaScript are missed. A more comprehensive approach would use a secondary scoring pass to identify under-detected domains and re-process them. In this particular implementation the trade off for faster processing and simpler logic was ultimately chosen over slightly better accuracy.

**Rate limiting and bot-blocking**
Some domains return 403 regardless of headers, and others implement sophisticated bot detection (fingerprinting TLS handshakes, checking for headless browser signals, CAPTCHAs). Mitigations include rotating user agents, adding realistic browser headers, introducing request delays, and using residential proxies. Playwright's stealth mode (via `playwright-extra` + `puppeteer-extra-plugin-stealth`) helps against headless detection.

---

### 2. Scaling to Millions of Domains

Running millions of domains sequentially on a single machine is not feasible within weeks. The solution is horizontal scaling with a distributed pipeline:

**Domain queue**
Replace the flat text file with a message queue (RabbitMQ, Kafka, etc.). Each domain is a message. Workers consume from the queue, process the domain, and acknowledge on completion. Failed messages are re-queued with a dead-letter policy.

**Containerised fetch workers**
Package the fetch + parse pipeline as a stateless Docker container. Deploy N replicas behind the queue. Each container runs `CONCURRENCY_FETCH` parallel fetches. Adding more replicas linearly scales throughput. Fetch workers are cheap — they can run on small instances.

**Separate Playwright fleet**
Playwright is resource-heavy (CPU, memory, browser processes). Run it as a separate pool of larger instances. Fetch workers push CSR-detected domains to a secondary queue consumed by Playwright workers. This avoids over-provisioning expensive instances for the majority of domains that don't need a browser.

**Distributed output**
Each worker writes results to object storage (S3, GCS) as NDJSON partitions rather than a shared file. A final aggregation step merges and deduplicates. This eliminates the write-serialisation bottleneck entirely.

At 10 fetch workers per container, 100 containers, and a 5-second average per domain, throughput is roughly 1.2 million domains per day — enough to cover millions of domains in a few weeks.

---

### 3. Discovering New Technologies in the Future

**Extending the extractor registry**
The `IExtractor` interface and `ExtractorRegistry` are designed for this. Adding a new signal source requires implementing one interface method (`extract(pageData): RawSignal[]`) and registering the extractor. No other code changes are needed. For example, a `ManifestExtractor` reading `manifest.json` or a `RobotsExtractor` reading `robots.txt` would slot in without touching the fingerprinting pipeline.

**Keeping Wappalyzer patterns current**
The pattern database is community-maintained and updated regularly. The `postinstall` script fetches the latest patterns at install time from `enthec/webappanalyzer`. Re-running `npm install` picks up new technologies automatically. Pinning to a specific commit hash in the fetch script would give reproducible builds while still allowing controlled updates.

---

### Solution Explanation

#### Approach

  The core challenge is not fetching websites — that's trivial. The challenge is turning unstructured web responses into structured, evidence-backed technology detections
   in a way that is testable, extensible, and correct.

  My design separates the problem into two independent concerns: signal extraction (what raw data can we pull from a page?) and fingerprinting (which technology patterns
  does that data match?). These communicate through a single type — RawSignal — and neither knows anything about the other.

  This separation has a practical payoff: every extractor and the entire fingerprinting engine are pure functions with no side effects. They can be unit tested directly  
  against real Wappalyzer patterns without mocking anything. I wrote tests for these first, before any implementation, which caught several edge cases in the pattern DSL
  early.

  ---

#### The Non-Obvious Problems

  The Wappalyzer pattern DSL

  Wappalyzer patterns are not plain regexes. A pattern string like:

  php(?:/([\d.]+))?\;version:\1\;confidence:75

  uses \; as a delimiter to attach metadata — a version extraction template and a confidence weight — after the regex. Before compiling any regex, each pattern must be
  split and parsed. The version template has its own mini-syntax: \1 refers to capture group 1, \1?a:b is a ternary. Getting this wrong means either broken version
  detection or incorrect confidence scores accumulating across matched patterns. I built a dedicated parsePattern / applyPattern / extractVersion utility layer and tested
   it exhaustively before wiring it into the fingerprinting engine.

  Concurrent write corruption

  After the first full run, results.json was 64MB and Python's JSON parser refused to load it, reporting an invalid control character at column 890,812 of line 8,206.
  That column number — nearly a million characters into a single line — was the clue: it was a raw HTML document embedded in an evidence value.

  Two bugs in one:

  First, the FingerprintService was storing the full signal value in evidence.value. For html and scripts signal types, that value is the entire page HTML — potentially  
  hundreds of kilobytes. The fix was to store match[0] (the matched substring) instead.

  Second, and more seriously: ConcurrencyPool runs 10 domains in parallel, and each calls OutputWriter.write() concurrently. Node's fs.appendFile is not atomic for large
  writes — concurrent calls interleave their content in the file. The fix was a promise queue in OutputWriter: every write chains onto the previous one, so regardless of
  how many concurrent callers arrive, writes execute one at a time.

  The Preact false positive

  After fixing the output, analysis showed Preact detected on 163 out of 164 successful domains. The Wappalyzer Preact pattern uses a properties sub-check — it targets a
  broad CSS selector (body, body > *, #app, #root, ...) but only fires if those elements have a specific JavaScript DOM property (__k) attached by Preact's virtual DOM
  engine. Checking runtime JS properties requires browser execution, which we can't do on the plain fetch path.

  The bug was in how buildDomPatterns handled specs with only a properties sub-check: since there was no exists, text, or attributes field, the fallback logic incorrectly
   treated it as a pure existence check. body exists on every page — hence 163/164. The fix was to skip any dom spec where the only defined sub-check is properties.

  ---

#### Results

- Available in data/output
- 200 domains processed, each appearing exactly once in the output
- ~2,000 total technology detections across 162 successful domains (~12.6 per domain)
- 283 unique technology names detected
- 38 failures — split between dead domains (404s), bot-blocking (403s), and genuinely unreachable servers

  The evaluator benchmark was 477 unique technologies. The gap comes from three sources: 38 unreachable domains contribute zero detections; JS-based signals (jsGlobals)  
  are only populated on the Playwright path, so the majority of domains miss JS fingerprints entirely; and some pattern coverage difference between runs. The detections  
  we do produce are accurate — the top technologies (jQuery 64%, PHP 61%, WordPress 46%, Google Analytics 23%) match real-world web technology distribution.

  ---

#### What I Would Do Next

  Tactically: trigger Playwright on any domain with fewer than 3 detected technologies, not just zero. Many partially server-rendered pages return enough HTML to avoid
  the zero-technology threshold but still miss JS-loaded signals.

  Structurally: replace the append-only JSON file with NDJSON (one JSON object per line). The current approach serialises writes via a promise queue — correct, but a
  process crash between writes produces a malformed file with no recovery path. NDJSON is inherently crash-safe: each line is a complete, independent record. Aggregation
  becomes a line-by-line read rather than parsing a multi-megabyte JSON array.
