/** IDs are decimal digit strings so they can round-trip snowflake BigInts safely. */
export function assertIdentifier(value: string, field: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${field} id is invalid`)
  }
}
