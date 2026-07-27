import { describe, expect, it } from 'vitest'

import {
  isCanonicalContentType,
  isImageAttachmentContentType,
  isValidAttachmentFilename,
  isVideoAttachmentContentType,
  MESSAGE_ATTACHMENT_MAX_BYTES,
  messageAttachmentValidationMessage,
  validateMessageAttachmentFile,
} from '@/features/messages/attachment-validation'

describe('validateMessageAttachmentFile', () => {
  it('accepts any canonical MIME type within the Media size limit', () => {
    expect(
      validateMessageAttachmentFile(
        new File(['x'], 'shot.png', { type: 'image/png' }),
      ),
    ).toBeUndefined()
    expect(
      validateMessageAttachmentFile(
        new File(['x'], 'notes.pdf', { type: 'application/pdf' }),
      ),
    ).toBeUndefined()
    expect(
      validateMessageAttachmentFile(
        new File(['x'], 'blob.bin', { type: 'application/octet-stream' }),
      ),
    ).toBeUndefined()
    expect(
      validateMessageAttachmentFile(
        new File(['x'], 'anim.gif', { type: 'image/gif' }),
      ),
    ).toBeUndefined()
  })

  it('rejects empty or parameterized content types', () => {
    expect(validateMessageAttachmentFile(new File(['x'], 'a.bin', { type: '' }))).toBe(
      messageAttachmentValidationMessage.contentType,
    )
    expect(
      validateMessageAttachmentFile(
        new File(['x'], 'a.txt', { type: 'text/plain; charset=utf-8' }),
      ),
    ).toBe(messageAttachmentValidationMessage.contentType)
  })

  it('rejects oversized files and invalid filenames', () => {
    const oversized = new File([new Uint8Array(2)], 'big.bin', {
      type: 'application/octet-stream',
    })
    Object.defineProperty(oversized, 'size', { value: MESSAGE_ATTACHMENT_MAX_BYTES + 1 })
    expect(validateMessageAttachmentFile(oversized)).toBe(messageAttachmentValidationMessage.size)
    expect(
      validateMessageAttachmentFile(
        new File(['x'], '../secret.pdf', { type: 'application/pdf' }),
      ),
    ).toBe(messageAttachmentValidationMessage.filename)
  })
})

describe('attachment helpers', () => {
  it('detects image and video content types for inline rendering', () => {
    expect(isImageAttachmentContentType('image/png')).toBe(true)
    expect(isImageAttachmentContentType('image/gif')).toBe(true)
    expect(isImageAttachmentContentType('application/pdf')).toBe(false)
    expect(isVideoAttachmentContentType('video/mp4')).toBe(true)
    expect(isVideoAttachmentContentType('video/webm')).toBe(true)
    expect(isVideoAttachmentContentType('image/png')).toBe(false)
  })

  it('validates canonical content types and filenames like Media', () => {
    expect(isCanonicalContentType('image/png')).toBe(true)
    expect(isCanonicalContentType('IMAGE/PNG')).toBe(false)
    expect(isCanonicalContentType('image/png; charset=binary')).toBe(false)
    expect(isValidAttachmentFilename('shot.png')).toBe(true)
    expect(isValidAttachmentFilename('a/b.png')).toBe(false)
  })
})
