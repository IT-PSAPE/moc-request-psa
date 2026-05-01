import { tableKey, type MockTable } from './storage-keys'

type Row = { id: string }
type Listener = () => void

type StoreEntry = {
    rows: Row[]
    listeners: Set<Listener>
    seeded: boolean
}

const stores = new Map<MockTable, StoreEntry>()

function readFromStorage(table: MockTable): Row[] | null {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(tableKey(table))
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as Row[]) : null
    } catch {
        return null
    }
}

function writeToStorage(table: MockTable, rows: Row[]): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(tableKey(table), JSON.stringify(rows))
}

function getEntry(table: MockTable): StoreEntry {
    let entry = stores.get(table)
    if (!entry) {
        const persisted = readFromStorage(table)
        entry = {
            rows: persisted ?? [],
            listeners: new Set(),
            seeded: persisted !== null,
        }
        stores.set(table, entry)
    }
    return entry
}

function notify(entry: StoreEntry): void {
    for (const listener of entry.listeners) listener()
}

export type MockStore<T extends Row> = {
    isSeeded(): boolean
    seed(rows: T[]): void
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
        isSeeded() {
            return entry.seeded
        },
        seed(rows) {
            if (entry.seeded) return
            entry.rows = rows.map(row => ({ ...row }))
            entry.seeded = true
            writeToStorage(table, entry.rows)
            notify(entry)
        },
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
            writeToStorage(table, entry.rows)
            notify(entry)
            return next
        },
        update(id, patch) {
            const index = entry.rows.findIndex(row => row.id === id)
            if (index === -1) {
                throw new Error(`mockStore(${table}): no row with id "${id}"`)
            }
            const next = { ...entry.rows[index], ...patch } as Row
            entry.rows = [...entry.rows.slice(0, index), next, ...entry.rows.slice(index + 1)]
            writeToStorage(table, entry.rows)
            notify(entry)
            return next as T
        },
        upsert(row) {
            const index = entry.rows.findIndex(existing => existing.id === row.id)
            if (index === -1) {
                entry.rows = [...entry.rows, { ...row } as Row]
            } else {
                entry.rows = [...entry.rows.slice(0, index), { ...entry.rows[index], ...row } as Row, ...entry.rows.slice(index + 1)]
            }
            writeToStorage(table, entry.rows)
            notify(entry)
            return entry.rows[index === -1 ? entry.rows.length - 1 : index] as T
        },
        delete(id) {
            const before = entry.rows.length
            entry.rows = entry.rows.filter(row => row.id !== id)
            if (entry.rows.length !== before) {
                writeToStorage(table, entry.rows)
                notify(entry)
            }
        },
        deleteWhere(predicate) {
            const before = entry.rows.length
            entry.rows = (entry.rows as T[]).filter(row => !predicate(row)) as Row[]
            const removed = before - entry.rows.length
            if (removed > 0) {
                writeToStorage(table, entry.rows)
                notify(entry)
            }
            return removed
        },
        bulkLoad(rows) {
            entry.rows = rows.map(row => ({ ...row })) as Row[]
            entry.seeded = true
            writeToStorage(table, entry.rows)
            notify(entry)
        },
        subscribe(fn) {
            entry.listeners.add(fn)
            return () => {
                entry.listeners.delete(fn)
            }
        },
    }
}

export function clearMockTable(table: MockTable): void {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(tableKey(table))
    }
    const entry = stores.get(table)
    if (entry) {
        entry.rows = []
        entry.seeded = false
        notify(entry)
    }
}
