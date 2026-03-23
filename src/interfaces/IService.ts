interface IService {
  initialize(): Promise<void>
  cleanup(): Promise<void>
}

export default IService
