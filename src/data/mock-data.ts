import { loadMockDataBundle } from './mock-api'
import { initializePasswords } from './mock-passwords'
import { initializeMockStore } from './store/mock-store'

export async function initializeMockData(): Promise<void> {
    const bundle = await loadMockDataBundle()
    initializeMockStore(bundle.tables)
    initializePasswords(bundle.passwords)
}
