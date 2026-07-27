/** Matches Media `maxUploadSizeBytes` default (500 MiB). */
export const MESSAGE_ATTACHMENT_MAX_BYTES = 524_288_000

/** Matches Message `limits.attachmentsPerMessage` default. */
export const MESSAGE_ATTACHMENT_MAX_COUNT = 10

export const messageAttachmentValidationMessage = {
  contentType: 'A valid Content-Type is required (for example image/png or application/pdf).',
  count: `You can attach up to ${MESSAGE_ATTACHMENT_MAX_COUNT} files.`,
  filename: 'Choose a file with a valid name (no path separators).',
  size: 'Each file must be 500 MB or smaller.',
} as const

/**
 * Client-side gates aligned with Media + Message:
 * - Content-Type: canonical type/subtype, no parameters (Media `normalizeContentType`)
 * - Message attachments are not limited to the avatar/icon image allowlist
 * - Size: Media `maxUploadSizeBytes`
 * - Filename: Media `validateAttachmentFilename`
 */
export function validateMessageAttachmentFile(file: File): string | undefined {
  const rawType = file.type.trim()
  if (rawType.includes(';') || !isCanonicalContentType(rawType.toLowerCase())) {
    return messageAttachmentValidationMessage.contentType
  }

  if (file.size <= 0 || file.size > MESSAGE_ATTACHMENT_MAX_BYTES) {
    return messageAttachmentValidationMessage.size
  }

  if (!isValidAttachmentFilename(file.name)) {
    return messageAttachmentValidationMessage.filename
  }

  return undefined
}

export function isImageAttachmentContentType(contentType: string) {
  return contentType.toLowerCase().startsWith('image/')
}

export function isVideoAttachmentContentType(contentType: string) {
  return contentType.toLowerCase().startsWith('video/')
}

/**
 * Canonical lowercase type/subtype with no parameters.
 * Matches Media after `strings.ToLower` on the parsed media type.
 */
export function isCanonicalContentType(value: string) {
  if (!value || value !== value.trim() || value !== value.toLowerCase()) return false
  if (value.includes(';')) return false
  const slash = value.indexOf('/')
  if (slash <= 0 || slash !== value.lastIndexOf('/') || slash === value.length - 1) {
    return false
  }
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(value)
}

/** Mirrors Media `validateAttachmentFilename`. */
export function isValidAttachmentFilename(value: string) {
  if (
    !value ||
    value.trim() !== value ||
    value.length > 255 ||
    value === '.' ||
    value === '..' ||
    value.includes('/') ||
    value.includes('\\')
  ) {
    return false
  }

  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code < 0x20 || code === 0x7f) return false
  }

  return true
}
