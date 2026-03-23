import CrawlStatus from '../types/CrawlStatus'
import TechnologyResult from './TechnologyResult'

interface DomainResult {
  domain: string
  finalUrl: string
  status: CrawlStatus
  technologies: TechnologyResult[]
  crawledAt: string  // ISO timestamp
}

export default DomainResult
