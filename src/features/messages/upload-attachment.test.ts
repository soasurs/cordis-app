import { beforeEach, describe, expect, it, vi } from 'vitest'

const messageApi = vi.hoisted(() => ({
  abortAttachmentUpload: vi.fn(),
  completeAttachmentUpload: vi.fn(),
  createAttachmentUpload: vi.fn(),
}))

const assetsApi = vi.hoisted(() => ({
  putToPresignedUrl: vi.fn(),
}))

vi.mock('@/api/message', () => messageApi)
vi.mock('@/api/assets', async (importOriginal) => ({
  ...(await importOriginal()),
  ...assetsApi,
}))

import { uploadMessageAttachment } from '@/features/messages/upload-attachment'
import { UploadIntentRetiredError } from '@/api/assets'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('uploadMessageAttachment', () => {
  it('creates, puts, and completes an upload', async () => {
    messageApi.createAttachmentUpload.mockResolvedValue({
      expiresAt: 9_000,
      idempotentReplay: false,
      presignedUrl: 'https://upload.example.com/put',
      requestHeaders: { 'Content-Type': 'image/png' },
      status: 'created',
      uploadId: '55',
    })
    assetsApi.putToPresignedUrl.mockResolvedValue(undefined)
    messageApi.completeAttachmentUpload.mockResolvedValue({
      assetId: '55',
      contentType: 'image/png',
      filename: 'shot.png',
      height: 0,
      size: 4,
      url: 'https://cdn.example.com/shot.png',
      urlExpiresAt: 0,
      width: 0,
    })

    const file = new File(['abcd'], 'shot.png', { type: 'image/png' })
    await expect(uploadMessageAttachment('43', file, 'attachment-intent')).resolves.toEqual(
      expect.objectContaining({ assetId: '55', filename: 'shot.png' }),
    )
    expect(messageApi.createAttachmentUpload).toHaveBeenCalledWith('43', {
      contentType: 'image/png',
      expectedSize: 4,
      filename: 'shot.png',
      idempotencyKey: 'attachment-intent',
    })
    expect(assetsApi.putToPresignedUrl).toHaveBeenCalledOnce()
    expect(messageApi.completeAttachmentUpload).toHaveBeenCalledWith('43', '55')
    expect(messageApi.abortAttachmentUpload).not.toHaveBeenCalled()
  })

  it('aborts when the presigned PUT fails', async () => {
    messageApi.createAttachmentUpload.mockResolvedValue({
      expiresAt: 9_000,
      idempotentReplay: false,
      presignedUrl: 'https://upload.example.com/put',
      requestHeaders: {},
      status: 'created',
      uploadId: '55',
    })
    assetsApi.putToPresignedUrl.mockRejectedValue(new Error('network'))
    messageApi.abortAttachmentUpload.mockResolvedValue(undefined)

    const file = new File(['abcd'], 'shot.png', { type: 'image/png' })
    await expect(uploadMessageAttachment('43', file, 'attachment-intent')).rejects.toThrow(
      'network',
    )
    expect(messageApi.abortAttachmentUpload).toHaveBeenCalledWith('43', '55')
    expect(messageApi.completeAttachmentUpload).not.toHaveBeenCalled()
  })

  it('keeps the upload intent when completion fails after the PUT', async () => {
    messageApi.createAttachmentUpload.mockResolvedValue({
      expiresAt: 9_000,
      idempotentReplay: false,
      presignedUrl: 'https://upload.example.com/put',
      requestHeaders: {},
      status: 'created',
      uploadId: '55',
    })
    assetsApi.putToPresignedUrl.mockResolvedValue(undefined)
    messageApi.completeAttachmentUpload.mockRejectedValue(new Error('complete failed'))

    const file = new File(['abcd'], 'shot.png', { type: 'image/png' })
    await expect(uploadMessageAttachment('43', file, 'attachment-intent')).rejects.toThrow(
      'complete failed',
    )
    expect(messageApi.completeAttachmentUpload).toHaveBeenCalledWith('43', '55')
    expect(messageApi.abortAttachmentUpload).not.toHaveBeenCalled()
  })

  it('skips the PUT when an idempotent replay is already terminal', async () => {
    messageApi.createAttachmentUpload.mockResolvedValue({
      expiresAt: 9_000,
      idempotentReplay: true,
      presignedUrl: '',
      requestHeaders: {},
      status: 'ready',
      uploadId: '55',
    })
    messageApi.completeAttachmentUpload.mockResolvedValue({
      assetId: '55',
      contentType: 'image/png',
      filename: 'shot.png',
      height: 0,
      size: 4,
      url: '',
      urlExpiresAt: 0,
      width: 0,
    })

    await uploadMessageAttachment(
      '43',
      new File(['abcd'], 'shot.png', { type: 'image/png' }),
      'attachment-intent',
    )

    expect(assetsApi.putToPresignedUrl).not.toHaveBeenCalled()
    expect(messageApi.completeAttachmentUpload).toHaveBeenCalledWith('43', '55')
    expect(messageApi.abortAttachmentUpload).not.toHaveBeenCalled()
  })

  it('retires the key when an idempotent replay is terminally failed', async () => {
    messageApi.createAttachmentUpload.mockResolvedValue({
      expiresAt: 9_000,
      idempotentReplay: true,
      presignedUrl: '',
      requestHeaders: {},
      status: 'failed',
      uploadId: '55',
    })

    await expect(
      uploadMessageAttachment(
        '43',
        new File(['abcd'], 'shot.png', { type: 'image/png' }),
        'attachment-intent',
      ),
    ).rejects.toBeInstanceOf(UploadIntentRetiredError)
    expect(assetsApi.putToPresignedUrl).not.toHaveBeenCalled()
    expect(messageApi.completeAttachmentUpload).not.toHaveBeenCalled()
    expect(messageApi.abortAttachmentUpload).not.toHaveBeenCalled()
  })
})
