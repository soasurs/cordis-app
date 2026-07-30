export function assertUserIdentifier(value: string) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('user id is invalid')
  }
}
