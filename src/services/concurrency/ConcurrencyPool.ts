class ConcurrencyPool {
    async run<T>(items: string[], batchSize: number, task: (item: string) => Promise<T>): Promise<T[]> {
        const results: T[] = []

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize)
            const batchResult = await Promise.all(batch.map(task))
            results.push(...batchResult)
        }

        return results
    }
}

export default ConcurrencyPool
