import { describe, expect, it, vi } from 'vitest'

import {
  clampImageOffset,
  cropImageToFile,
  getCenteredOffset,
  getCoverScale,
  getCropAreaFromTransform,
  getImageDisplaySize,
  GUILD_ICON_MAX_ZOOM,
  GUILD_ICON_MIN_ZOOM,
  GUILD_ICON_OUTPUT_SIZE,
  zoomAroundViewportPoint,
} from '@/features/guilds/crop-image'

describe('crop-image', () => {
  it('covers the square viewport with the shorter image side at zoom 1', () => {
    expect(getCoverScale(800, 400, 320)).toBe(0.8)
    expect(getImageDisplaySize(800, 400, 1, 320)).toEqual({
      height: 320,
      scale: 0.8,
      width: 640,
    })
    expect(getCenteredOffset(800, 400, 1, 320)).toEqual({
      offsetX: -160,
      offsetY: 0,
      zoom: 1,
    })
  })

  it('covers portrait images and maps their centered crop area', () => {
    expect(getCoverScale(300, 900, 240)).toBe(0.8)
    const transform = getCenteredOffset(300, 900, 1, 240)
    expect(transform).toEqual({
      offsetX: 0,
      offsetY: -240,
      zoom: 1,
    })
    expect(getCropAreaFromTransform(300, 900, transform, 240)).toEqual({
      height: 300,
      width: 300,
      x: 0,
      y: 300,
    })
  })

  it('clamps pan so the square stays filled', () => {
    expect(clampImageOffset(40, -10, 800, 400, 1, 320)).toEqual({
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    })
    expect(clampImageOffset(-500, 20, 800, 400, 1, 320)).toEqual({
      offsetX: -320,
      offsetY: 0,
      zoom: 1,
    })
  })

  it('maps the viewport transform back to image crop coordinates', () => {
    const transform = getCenteredOffset(800, 400, 1, 320)
    expect(getCropAreaFromTransform(800, 400, transform, 320)).toEqual({
      height: 400,
      width: 400,
      x: 200,
      y: 0,
    })
  })

  it('zooms around a viewport point without jumping the focal pixel', () => {
    const start = getCenteredOffset(800, 400, 1, 320)
    const zoomed = zoomAroundViewportPoint(start, 2, 160, 160, 800, 400, 320)
    expect(zoomed.zoom).toBe(2)
    const before = {
      x: (160 - start.offsetX) / getImageDisplaySize(800, 400, start.zoom, 320).scale,
      y: (160 - start.offsetY) / getImageDisplaySize(800, 400, start.zoom, 320).scale,
    }
    const after = {
      x: (160 - zoomed.offsetX) / getImageDisplaySize(800, 400, zoomed.zoom, 320).scale,
      y: (160 - zoomed.offsetY) / getImageDisplaySize(800, 400, zoomed.zoom, 320).scale,
    }
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('clamps zoom to the configured min and max', () => {
    const start = getCenteredOffset(800, 400, 1, 320)
    expect(zoomAroundViewportPoint(start, 0.1, 160, 160, 800, 400, 320).zoom).toBe(
      GUILD_ICON_MIN_ZOOM,
    )
    expect(zoomAroundViewportPoint(start, 99, 160, 160, 800, 400, 320).zoom).toBe(
      GUILD_ICON_MAX_ZOOM,
    )
  })

  it('rejects invalid image dimensions when computing cover scale', () => {
    expect(() => getCoverScale(0, 100)).toThrow('Unable to crop this image. Please try again.')
  })

  it('exports a cropped file using the original content type', async () => {
    const source = {
      height: 100,
      width: 200,
    } as CanvasImageSource

    const drawImage = vi.fn()
    const context = {
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
    }
    const toBlob = vi.fn(function mockToBlob(
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
      quality?: number,
    ) {
      callback(
        new Blob([`cropped:${this.width}x${this.height}:${quality ?? ''}`], {
          type: type ?? 'image/png',
        }),
      )
    })

    const createElement = vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string,
    ) => {
      if (tagName === 'canvas') {
        return {
          getContext: () => context,
          height: 0,
          toBlob,
          width: 0,
        } as unknown as HTMLCanvasElement
      }
      return document.createElement(tagName)
    }) as typeof document.createElement)

    const file = await cropImageToFile(
      source,
      { height: 100, width: 100, x: 50, y: 0 },
      'image/png',
      'community.webp',
    )

    expect(file.type).toBe('image/png')
    expect(file.name).toBe('community.png')
    expect(drawImage).toHaveBeenCalledWith(
      source,
      50,
      0,
      100,
      100,
      0,
      0,
      GUILD_ICON_OUTPUT_SIZE,
      GUILD_ICON_OUTPUT_SIZE,
    )
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined)

    const jpeg = await cropImageToFile(
      source,
      { height: 100, width: 100, x: 0, y: 0 },
      'image/jpeg',
      'icon.jpeg',
    )
    expect(jpeg.type).toBe('image/jpeg')
    expect(jpeg.name).toBe('icon.jpg')
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8)

    createElement.mockRestore()
  })
})
