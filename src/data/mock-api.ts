import type { MockDataBundle, MockPasswords, MockRow, MockTable } from './mock-schema'

const MOCK_DATA_ENDPOINT = '/api/mock-data'

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Mock data request failed with ${response.status}`)
    }
    return response.json() as Promise<T>
}

export async function loadMockDataBundle(): Promise<MockDataBundle> {
    const response = await fetch(MOCK_DATA_ENDPOINT, { cache: 'no-store' })
    return parseResponse<MockDataBundle>(response)
}

export async function persistMockTable(table: MockTable, rows: MockRow[]): Promise<void> {
    const response = await fetch(MOCK_DATA_ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: { [table]: rows } }),
    })
    await parseResponse(response)
}

export async function persistMockPasswords(passwords: MockPasswords): Promise<void> {
    const response = await fetch(MOCK_DATA_ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwords }),
    })
    await parseResponse(response)
}
