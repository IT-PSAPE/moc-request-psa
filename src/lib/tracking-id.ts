// Crockford Base32 — excludes I, L, O, U to avoid ambiguity with 1, 0, V.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const LENGTH = 8

export function generateTrackingId(): string {
    const bytes = new Uint8Array(LENGTH)
    crypto.getRandomValues(bytes)
    let out = ''
    for (let i = 0; i < LENGTH; i += 1) {
        out += ALPHABET[bytes[i] & 0x1f]
    }
    return out
}

export function generateUniqueTrackingId(exists: (id: string) => boolean, maxAttempts = 8): string {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const candidate = generateTrackingId()
        if (!exists(candidate)) return candidate
    }
    throw new Error('Could not allocate a unique tracking ID')
}
