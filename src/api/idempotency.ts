const MAX_IDEMPOTENCY_KEY_BYTES = 255

export interface IdempotencyIntent {
  fingerprint: string
  key: string
}

export function createIdempotencyKey(): string {
  const randomUUID = globalThis.crypto?.randomUUID
  if (!randomUUID) {
    throw new Error('secure random UUID generation is unavailable')
  }

  return randomUUID.call(globalThis.crypto)
}

export function getIdempotencyKeyForIntent(
  current: IdempotencyIntent | undefined,
  fingerprint: string,
): IdempotencyIntent {
  if (current?.fingerprint === fingerprint) {
    return current
  }

  return {
    fingerprint,
    key: createIdempotencyKey(),
  }
}

export function assertIdempotencyKey(value: string): void {
  if (!value) {
    throw new Error('idempotency key is required')
  }
  if (value.trim() !== value) {
    throw new Error('idempotency key must not have leading or trailing whitespace')
  }
  if (new TextEncoder().encode(value).byteLength > MAX_IDEMPOTENCY_KEY_BYTES) {
    throw new Error('idempotency key is too long')
  }
}

export function optionalIdempotencyKey(value: string | undefined): { idempotencyKey?: string } {
  if (value === undefined) {
    return {}
  }

  assertIdempotencyKey(value)
  return { idempotencyKey: value }
}
