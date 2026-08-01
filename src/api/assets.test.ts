import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isTerminalUploadStatus,
  putToPresignedUrl,
  resolveAvatarUrl,
  resolveGuildIconUrl,
  toUploadStatus,
} from '@/api/assets'
import { UploadStatus } from '@/gen/api/v1/media_pb'

describe('asset URLs', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_MINIO_URL', 'http://storage.cordis.localhost:9000/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds public guild icon and avatar URLs from the MinIO origin', () => {
    expect(resolveGuildIconUrl('42', '99')).toBe(
      'http://storage.cordis.localhost:9000/cordis-public/icons/42/99',
    )
    expect(resolveAvatarUrl('7', '11')).toBe(
      'http://storage.cordis.localhost:9000/cordis-public/avatars/7/11',
    )
  })

  it('returns undefined when the asset id is zero or missing', () => {
    expect(resolveGuildIconUrl('42', '0')).toBeUndefined()
    expect(resolveGuildIconUrl('42', '')).toBeUndefined()
    expect(resolveAvatarUrl('7', '0')).toBeUndefined()
  })

  it('returns undefined when the MinIO origin is unset', () => {
    vi.stubEnv('VITE_MINIO_URL', '')
    expect(resolveGuildIconUrl('42', '99')).toBeUndefined()
  })
})

describe('putToPresignedUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('PUTs the file with required headers and omits browser-managed ones', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const file = new Blob(['icon-bytes'], { type: 'image/png' })

    await putToPresignedUrl(file, {
      presignedUrl: 'https://storage.example/upload?X-Amz-Signature=abc',
      requestHeaders: {
        'Content-Length': '10',
        'Content-Type': 'image/png',
        'x-amz-meta-owner': '42',
      },
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://storage.example/upload?X-Amz-Signature=abc')
    expect(init).toMatchObject({
      body: file,
      method: 'PUT',
    })
    const headers = init.headers as Headers
    expect(headers.get('Content-Type')).toBe('image/png')
    expect(headers.get('x-amz-meta-owner')).toBe('42')
    expect(headers.has('Content-Length')).toBe(false)
  })

  it('throws a safe error when the upload response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))

    await expect(
      putToPresignedUrl(new Blob(['icon-bytes']), {
        presignedUrl: 'https://storage.example/upload',
        requestHeaders: { 'Content-Type': 'image/png' },
      }),
    ).rejects.toThrow('Unable to upload the file. Please try again.')
  })

  it('throws a safe error when fetch itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(
      putToPresignedUrl(new Blob(['icon-bytes']), {
        presignedUrl: 'https://storage.example/upload',
        requestHeaders: { 'Content-Type': 'image/png' },
      }),
    ).rejects.toThrow('Unable to upload the file. Check your connection and try again.')
  })
})

describe('upload status mapping', () => {
  it('maps every supported protocol status', () => {
    expect(toUploadStatus(UploadStatus.CREATED)).toBe('created')
    expect(toUploadStatus(UploadStatus.COMPLETING)).toBe('completing')
    expect(toUploadStatus(UploadStatus.READY)).toBe('ready')
    expect(toUploadStatus(UploadStatus.FAILED)).toBe('failed')
    expect(toUploadStatus(UploadStatus.ABORTED)).toBe('aborted')
    expect(toUploadStatus(UploadStatus.EXPIRED)).toBe('expired')
  })

  it('rejects unspecified statuses and identifies terminal states', () => {
    expect(() => toUploadStatus(UploadStatus.UNSPECIFIED)).toThrow('upload status is invalid')
    expect(isTerminalUploadStatus('failed')).toBe(true)
    expect(isTerminalUploadStatus('ready')).toBe(false)
  })
})
