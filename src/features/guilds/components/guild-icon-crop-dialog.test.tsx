import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GuildIconCropDialog } from '@/features/guilds/components/guild-icon-crop-dialog'

const cropApi = vi.hoisted(() => ({
  cropImageToFile: vi.fn(),
  getCenteredOffset: vi.fn(),
  getCropAreaFromTransform: vi.fn(),
  getImageDisplaySize: vi.fn(),
  loadImageFromFile: vi.fn(),
  rotateImageClockwise: vi.fn(),
  zoomAroundViewportPoint: vi.fn(),
}))

vi.mock('@/features/guilds/crop-image', async () => {
  const actual = await vi.importActual<typeof import('@/features/guilds/crop-image')>(
    '@/features/guilds/crop-image',
  )
  return {
    ...actual,
    cropImageToFile: cropApi.cropImageToFile,
    getCenteredOffset: cropApi.getCenteredOffset,
    getCropAreaFromTransform: cropApi.getCropAreaFromTransform,
    getImageDisplaySize: cropApi.getImageDisplaySize,
    loadImageFromFile: cropApi.loadImageFromFile,
    rotateImageClockwise: cropApi.rotateImageClockwise,
    zoomAroundViewportPoint: cropApi.zoomAroundViewportPoint,
  }
})

describe('GuildIconCropDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const image = {
      naturalHeight: 200,
      naturalWidth: 400,
      src: 'blob:image',
    } as HTMLImageElement
    cropApi.loadImageFromFile.mockResolvedValue({
      image,
      revoke: vi.fn(),
    })
    cropApi.getCenteredOffset.mockReturnValue({
      offsetX: -80,
      offsetY: 0,
      zoom: 1,
    })
    cropApi.getImageDisplaySize.mockReturnValue({
      height: 240,
      scale: 1.2,
      width: 480,
    })
    cropApi.getCropAreaFromTransform.mockReturnValue({
      height: 200,
      width: 200,
      x: 100,
      y: 0,
    })
    cropApi.zoomAroundViewportPoint.mockImplementation((_transform, zoom) => ({
      offsetX: -80,
      offsetY: 0,
      zoom,
    }))
    cropApi.cropImageToFile.mockResolvedValue(
      new File(['cropped'], 'icon.png', { type: 'image/png' }),
    )
    cropApi.rotateImageClockwise.mockResolvedValue({
      image: {
        naturalHeight: 400,
        naturalWidth: 200,
        src: 'blob:rotated',
      } as HTMLImageElement,
      revoke: vi.fn(),
    })
  })

  it('confirms a cropped file in the original format after a second confirmation', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    const file = new File(['source'], 'icon.png', { type: 'image/png' })
    render(<GuildIconCropDialog file={file} onCancel={onCancel} onConfirm={onConfirm} />)
    const user = userEvent.setup()

    expect(await screen.findByRole('dialog')).toHaveTextContent('Edit image')
    expect(screen.getByLabelText('Zoom image')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotate image' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(cropApi.cropImageToFile).toHaveBeenCalledOnce())
    expect(cropApi.getCropAreaFromTransform).toHaveBeenCalledWith(400, 200, {
      offsetX: -80,
      offsetY: 0,
      zoom: 1,
    })
    expect(cropApi.cropImageToFile).toHaveBeenCalledWith(
      expect.objectContaining({ naturalWidth: 400, naturalHeight: 200 }),
      { height: 200, width: 200, x: 100, y: 0 },
      'image/png',
      'icon.png',
    )
    expect(onConfirm).not.toHaveBeenCalled()
    expect(await screen.findByRole('dialog')).toHaveTextContent('Confirm icon')
    expect(screen.getByAltText('Cropped community icon preview')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'icon.png', type: 'image/png' }),
    )
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('returns to the editor when Back is chosen on the confirmation step', async () => {
    render(
      <GuildIconCropDialog
        file={new File(['source'], 'icon.png', { type: 'image/png' })}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Apply' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Confirm icon')
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('Edit image')
    expect(screen.getByLabelText('Zoom image')).toBeInTheDocument()
  })

  it('keeps the editor open when cropping fails', async () => {
    cropApi.cropImageToFile.mockRejectedValue(
      new Error('Unable to crop this image. Please try again.'),
    )
    render(
      <GuildIconCropDialog
        file={new File(['source'], 'icon.png', { type: 'image/png' })}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to crop this image. Please try again.',
    )
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit image')
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
  })

  it('only confirms once when Upload is clicked repeatedly', async () => {
    const onConfirm = vi.fn()
    render(
      <GuildIconCropDialog
        file={new File(['source'], 'icon.png', { type: 'image/png' })}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Apply' }))
    const upload = await screen.findByRole('button', { name: 'Upload' })
    await user.click(upload)
    await user.click(upload)

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('shows a load error when the source image cannot be read', async () => {
    cropApi.loadImageFromFile.mockRejectedValue(
      new Error('Unable to read this image. Please try another file.'),
    )
    render(
      <GuildIconCropDialog
        file={new File(['source'], 'icon.png', { type: 'image/png' })}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to read this image. Please try another file.',
    )
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('zooms the image from the slider around the viewport center', async () => {
    render(
      <GuildIconCropDialog
        file={new File(['source'], 'icon.webp', { type: 'image/webp' })}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    const zoom = await screen.findByLabelText('Zoom image')
    fireEvent.change(zoom, { target: { value: '2' } })

    expect(cropApi.zoomAroundViewportPoint).toHaveBeenCalledWith(
      { offsetX: -80, offsetY: 0, zoom: 1 },
      2,
      120,
      120,
      400,
      200,
    )
  })

  it('rotates the image and recenters the crop', async () => {
    render(
      <GuildIconCropDialog
        file={new File(['source'], 'icon.png', { type: 'image/png' })}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Rotate image' }))

    await waitFor(() => expect(cropApi.rotateImageClockwise).toHaveBeenCalledOnce())
    expect(cropApi.getCenteredOffset).toHaveBeenLastCalledWith(200, 400, 1)
  })

  it('resets zoom and rotation back to the source image', async () => {
    render(
      <GuildIconCropDialog
        file={new File(['source'], 'icon.png', { type: 'image/png' })}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Rotate image' }))
    await waitFor(() => expect(cropApi.rotateImageClockwise).toHaveBeenCalledOnce())
    cropApi.getCenteredOffset.mockClear()

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(cropApi.getCenteredOffset).toHaveBeenCalledWith(400, 200, 1)
  })

  it('closes without uploading when cancelled', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      <GuildIconCropDialog
        file={new File(['source'], 'icon.webp', { type: 'image/webp' })}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )
    const user = userEvent.setup()

    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(cropApi.cropImageToFile).not.toHaveBeenCalled()
  })
})
