export const GUILD_ICON_OUTPUT_SIZE = 256
export const GUILD_ICON_EXPORT_QUALITY = 0.8
export const GUILD_ICON_CROP_STAGE = 360
export const GUILD_ICON_CROP_VIEWPORT = 240
export const GUILD_ICON_MIN_ZOOM = 1
export const GUILD_ICON_MAX_ZOOM = 3

export interface SquareCropArea {
  height: number
  width: number
  x: number
  y: number
}

export interface ImageCropTransform {
  offsetX: number
  offsetY: number
  zoom: number
}

export function loadImageFromFile(file: File): Promise<{
  image: HTMLImageElement
  revoke: () => void
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        URL.revokeObjectURL(url)
        reject(new Error('Unable to read this image. Please try another file.'))
        return
      }
      resolve({
        image,
        revoke: () => URL.revokeObjectURL(url),
      })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to read this image. Please try another file.'))
    }
    image.src = url
  })
}

/** Scale that makes the shorter image side exactly fill the square viewport. */
export function getCoverScale(
  imageWidth: number,
  imageHeight: number,
  viewportSize = GUILD_ICON_CROP_VIEWPORT,
) {
  const shorterSide = Math.min(imageWidth, imageHeight)
  if (shorterSide <= 0) {
    throw new Error('Unable to crop this image. Please try again.')
  }
  return viewportSize / shorterSide
}

export function getImageDisplaySize(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  viewportSize = GUILD_ICON_CROP_VIEWPORT,
) {
  const scale = getCoverScale(imageWidth, imageHeight, viewportSize) * zoom
  return {
    height: imageHeight * scale,
    scale,
    width: imageWidth * scale,
  }
}

export function getCenteredOffset(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  viewportSize = GUILD_ICON_CROP_VIEWPORT,
): ImageCropTransform {
  const { height, width } = getImageDisplaySize(imageWidth, imageHeight, zoom, viewportSize)
  return {
    offsetX: (viewportSize - width) / 2,
    offsetY: (viewportSize - height) / 2,
    zoom,
  }
}

export function clampImageOffset(
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  viewportSize = GUILD_ICON_CROP_VIEWPORT,
): ImageCropTransform {
  const { height, width } = getImageDisplaySize(imageWidth, imageHeight, zoom, viewportSize)
  const minX = Math.min(0, viewportSize - width)
  const minY = Math.min(0, viewportSize - height)
  return {
    offsetX: Math.min(0, Math.max(minX, offsetX)),
    offsetY: Math.min(0, Math.max(minY, offsetY)),
    zoom,
  }
}

export function zoomAroundViewportPoint(
  transform: ImageCropTransform,
  nextZoom: number,
  viewportX: number,
  viewportY: number,
  imageWidth: number,
  imageHeight: number,
  viewportSize = GUILD_ICON_CROP_VIEWPORT,
): ImageCropTransform {
  const zoom = Math.min(GUILD_ICON_MAX_ZOOM, Math.max(GUILD_ICON_MIN_ZOOM, nextZoom))
  const current = getImageDisplaySize(imageWidth, imageHeight, transform.zoom, viewportSize)
  const next = getImageDisplaySize(imageWidth, imageHeight, zoom, viewportSize)
  const imageX = (viewportX - transform.offsetX) / current.scale
  const imageY = (viewportY - transform.offsetY) / current.scale
  return clampImageOffset(
    viewportX - imageX * next.scale,
    viewportY - imageY * next.scale,
    imageWidth,
    imageHeight,
    zoom,
    viewportSize,
  )
}

export function getCropAreaFromTransform(
  imageWidth: number,
  imageHeight: number,
  transform: ImageCropTransform,
  viewportSize = GUILD_ICON_CROP_VIEWPORT,
): SquareCropArea {
  const { scale } = getImageDisplaySize(imageWidth, imageHeight, transform.zoom, viewportSize)
  const size = viewportSize / scale
  return {
    height: size,
    width: size,
    x: Math.max(0, -transform.offsetX / scale),
    y: Math.max(0, -transform.offsetY / scale),
  }
}

export async function rotateImageClockwise(image: HTMLImageElement): Promise<{
  image: HTMLImageElement
  revoke: () => void
}> {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalHeight
  canvas.height = image.naturalWidth
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to rotate this image. Please try again.')
  }

  context.translate(canvas.width, 0)
  context.rotate(Math.PI / 2)
  context.drawImage(image, 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error('Unable to rotate this image. Please try again.'))
        return
      }
      resolve(nextBlob)
    }, 'image/png')
  })

  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const nextImage = new Image()
    nextImage.onload = () => {
      resolve({
        image: nextImage,
        revoke: () => URL.revokeObjectURL(url),
      })
    }
    nextImage.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to rotate this image. Please try again.'))
    }
    nextImage.src = url
  })
}

export async function cropImageToFile(
  image: CanvasImageSource,
  area: SquareCropArea,
  contentType: string,
  fileName: string,
): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = GUILD_ICON_OUTPUT_SIZE
  canvas.height = GUILD_ICON_OUTPUT_SIZE

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to crop this image. Please try again.')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    GUILD_ICON_OUTPUT_SIZE,
    GUILD_ICON_OUTPUT_SIZE,
  )

  const blob = await canvasToBlob(canvas, contentType)
  return new File([blob], replaceExtension(fileName, contentType), {
    lastModified: Date.now(),
    type: contentType,
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, contentType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to crop this image. Please try again.'))
          return
        }
        resolve(blob)
      },
      contentType,
      contentType === 'image/jpeg' || contentType === 'image/webp'
        ? GUILD_ICON_EXPORT_QUALITY
        : undefined,
    )
  })
}

function replaceExtension(fileName: string, contentType: string) {
  const extension =
    contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'guild-icon'
  return `${baseName}.${extension}`
}
