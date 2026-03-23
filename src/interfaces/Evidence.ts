import SignalType from '../types/SignalType'

interface Evidence {
  signalType: SignalType
  key: string
  value: string
  regex: string
  version?: string
}

export default Evidence
