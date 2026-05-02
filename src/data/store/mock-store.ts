import { persistMockTable } from '../mock-api'
import type { MockDataTables, MockRow, MockTable } from '../mock-schema'

type Row = MockRow
type Listener = () => void

type StoreEntry = {
    rows: Row[]
    listeners: Set<Listener>
    pendingWrite: Promise<void>
}

const stores = new Map<MockTable, StoreEntry>()

function getEntry(table: MockTable): StoreEntry {
    const entry = stores.get(table)
    if (!entry) {
        throw new Error(`mockStore(${table}) was accessed before mock data initialization.`)
    }
    return entry
}

function notify(entry: StoreEntry): void {
    for (const listener of entry.listeners) listener()
}

function queuePersist(table: MockTable, entry: StoreEntry): void {
    const snapshot = entry.rows.map(row => ({ ...row }))
    entry.pendingWrite = entry.pendingWrite
        .catch(() => undefined)
        .then(() => persistMockTable(table, snapshot))

    void entry.pendingWrite.catch(error => {
        console.error(`Failed to persist mock table "${table}".`, error)
    })
}

export type MockStore<T extends Row> = {
    list(): T[]
    find(id: string): T | undefined
    where(predicate: (row: T) => boolean): T[]
    findOne(predicate: (row: T) => boolean): T | undefined
    insert(row: T): T
    update(id: string, patch: Partial<T>): T
    upsert(row: T): T
    delete(id: string): void
    deleteWhere(predicate: (row: T) => boolean): number
    bulkLoad(rows: T[]): void
    subscribe(fn: Listener): () => void
}

export function mockStore<T extends Row>(table: MockTable): MockStore<T> {
    const entry = getEntry(table)

    return {
        list() {
            return entry.rows.slice() as T[]
        },
        find(id) {
            return entry.rows.find(row => row.id === id) as T | undefined
        },
        where(predicate) {
            return (entry.rows as T[]).filter(predicate)
        },
        findOne(predicate) {
            return (entry.rows as T[]).find(predicate)
        },
        insert(row) {
            const next = { ...row }
            entry.rows = [...entry.rows, next as Row]
            notify(entry)
            queuePersist(table, entry)
            return next
        },
        update(id, patch) {
            const index = entry.rows.findIndex(row => row.id === id)
            if (index === -1) {
                throw new Error(`mockStore(${table}): no row with id "${id}"`)
            }
            const next = { ...entry.rows[index], ...patch } as Row
            entry.rows = [...entry.rows.slice(0, index), next, ...entry.rows.slice(index + 1)]
            notify(entry)
            queuePersist(table, entry)
            return next as T
        },
        upsert(row) {
            const index = entry.rows.findIndex(existing => existing.id === row.id)
            if (index === -1) {
                entry.rows = [...entry.rows, { ...row } as Row]
            } else {
                entry.rows = [...entry.rows.slice(0, index), { ...entry.rows[index], ...row } as Row, ...entry.rows.slice(index + 1)]
            }
            notify(entry)
            queuePersist(table, entry)
            return entry.rows[index === -1 ? entry.rows.length - 1 : index] as T
        },
        delete(id) {
            const before = entry.rows.length
            entry.rows = entry.rows.filter(row => row.id !== id)
            if (entry.rows.length !== before) {
                notify(entry)
                queuePersist(table, entry)
            }
        },
        deleteWhere(predicate) {
            const before = entry.rows.length
            entry.rows = (entry.rows as T[]).filter(row => !predicate(row)) as Row[]
            const removed = before - entry.rows.length
            if (removed > 0) {
                notify(entry)
                queuePersist(table, entry)
            }
            return removed
        },
        bulkLoad(rows) {
            entry.rows = rows.map(row => ({ ...row })) as Row[]
            notify(entry)
            queuePersist(table, entry)
        },
        subscribe(fn) {
            entry.listeners.add(fn)
            return () => {
                entry.listeners.delete(fn)
            }
        },
    }
}

export function initializeMockStore(tables: MockDataTables): void {
    stores.clear()
    for (const [table, rows] of Object.entries(tables) as [MockTable, MockRow[]][]) {
        stores.set(table, {
            rows: rows.map(row => ({ ...row })),
            listeners: new Set(),
            pendingWrite: Promise.resolve(),
        })
    }
}
