import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react'

import {
  clampImageOffset,
  cropImageToFile,
  getCenteredOffset,
  getCropAreaFromTransform,
  getImageDisplaySize,
  GUILD_ICON_CROP_VIEWPORT,
  GUILD_ICON_MIN_ZOOM,
  loadImageFromFile,
  rotateImageClockwise,
  zoomAroundViewportPoint,
  type ImageCropTransform,
} from '@/features/guilds/crop-image'

export type CropStep = 'edit' | 'confirm'

interface UseGuildIconCropOptions {
  file: File
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function useGuildIconCrop({ file, onCancel, onConfirm }: UseGuildIconCropOptions) {
  // Object-URL revokers: source = original upload; working = rotated canvas; preview = crop result.
  const sourceRevokeRef = useRef<(() => void) | undefined>(undefined)
  const workingRevokeRef = useRef<(() => void) | undefined>(undefined)
  const previewUrlRef = useRef<string | undefined>(undefined)
  const [image, setImage] = useState<HTMLImageElement>()
  // Unrotated original; Reset restores this and drops any working rotation blob.
  const [sourceImage, setSourceImage] = useState<HTMLImageElement>()
  const [loadError, setLoadError] = useState<string>()
  const [cropError, setCropError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [transform, setTransform] = useState<ImageCropTransform>()
  const [step, setStep] = useState<CropStep>('edit')
  const [previewFile, setPreviewFile] = useState<File>()
  const [previewUrl, setPreviewUrl] = useState<string>()
  // Stays true after confirm; parent closes the dialog once upload finishes.
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let cancelled = false

    void loadImageFromFile(file)
      .then(({ image: nextImage, revoke }) => {
        if (cancelled) {
          // Effect cleaned up before decode finished; free the URL immediately.
          revoke()
          return
        }
        workingRevokeRef.current?.()
        workingRevokeRef.current = undefined
        sourceRevokeRef.current?.()
        sourceRevokeRef.current = revoke
        setSourceImage(nextImage)
        setImage(nextImage)
        setTransform(
          getCenteredOffset(nextImage.naturalWidth, nextImage.naturalHeight, GUILD_ICON_MIN_ZOOM),
        )
        setLoadError(undefined)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unable to read this image. Please try another file.',
        )
      })

    return () => {
      cancelled = true
      workingRevokeRef.current?.()
      workingRevokeRef.current = undefined
      sourceRevokeRef.current?.()
      sourceRevokeRef.current = undefined
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = undefined
      }
    }
  }, [file])

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = undefined
    }
    setPreviewUrl(undefined)
    setPreviewFile(undefined)
  }

  const closeDialog = () => {
    // Block dismiss while async crop / rotate / parent upload is in flight.
    if (!pending && !rotating && !uploading) {
      onCancel()
    }
  }

  const resetTransform = () => {
    if (!sourceImage || pending || rotating || step !== 'edit') {
      return
    }
    workingRevokeRef.current?.()
    workingRevokeRef.current = undefined
    setImage(sourceImage)
    setTransform(
      getCenteredOffset(sourceImage.naturalWidth, sourceImage.naturalHeight, GUILD_ICON_MIN_ZOOM),
    )
    setCropError(undefined)
  }

  const handleApply = async () => {
    if (!image || !transform || pending || rotating || step !== 'edit') {
      return
    }

    setPending(true)
    setCropError(undefined)
    try {
      const area = getCropAreaFromTransform(image.naturalWidth, image.naturalHeight, transform)
      const cropped = await cropImageToFile(image, area, file.type, file.name)
      clearPreview()
      const nextPreviewUrl = URL.createObjectURL(cropped)
      previewUrlRef.current = nextPreviewUrl
      setPreviewFile(cropped)
      setPreviewUrl(nextPreviewUrl)
      setStep('confirm')
      setPending(false)
    } catch (error) {
      setCropError(
        error instanceof Error ? error.message : 'Unable to crop this image. Please try again.',
      )
      setPending(false)
    }
  }

  const handleBackToEdit = () => {
    if (pending || uploading) {
      return
    }
    clearPreview()
    setStep('edit')
  }

  const handleUpload = () => {
    if (!previewFile || pending || uploading) {
      return
    }
    setUploading(true)
    onConfirm(previewFile)
  }

  const handleRotate = async () => {
    if (!image || pending || rotating || step !== 'edit') {
      return
    }

    setRotating(true)
    setCropError(undefined)
    try {
      const rotated = await rotateImageClockwise(image)
      // Replace the previous working blob; sourceImage stays so Reset can restore.
      workingRevokeRef.current?.()
      workingRevokeRef.current = rotated.revoke
      setImage(rotated.image)
      setTransform(
        getCenteredOffset(
          rotated.image.naturalWidth,
          rotated.image.naturalHeight,
          transform?.zoom ?? GUILD_ICON_MIN_ZOOM,
        ),
      )
    } catch (error) {
      setCropError(
        error instanceof Error ? error.message : 'Unable to rotate this image. Please try again.',
      )
    } finally {
      setRotating(false)
    }
  }

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!image || !transform || pending || rotating || step !== 'edit') {
      return
    }
    event.preventDefault()

    // Capture origin once; move handlers must not read React state for the drag baseline.
    const origin = transform
    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const imageWidth = image.naturalWidth
    const imageHeight = image.naturalHeight

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }
      setTransform(
        clampImageOffset(
          origin.offsetX + (moveEvent.clientX - startX),
          origin.offsetY + (moveEvent.clientY - startY),
          imageWidth,
          imageHeight,
          origin.zoom,
        ),
      )
    }

    const endDrag = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) {
        return
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  const applyZoom = (nextZoom: number, viewportX: number, viewportY: number) => {
    if (!image || !transform || step !== 'edit') {
      return
    }
    setTransform(
      zoomAroundViewportPoint(
        transform,
        nextZoom,
        viewportX,
        viewportY,
        image.naturalWidth,
        image.naturalHeight,
      ),
    )
  }

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!image || !transform || pending || rotating || step !== 'edit') {
      return
    }
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    // Convert pointer coords into the crop-hole local space (viewport inset inside the stage).
    const holeLeft = (bounds.width - GUILD_ICON_CROP_VIEWPORT) / 2
    const holeTop = (bounds.height - GUILD_ICON_CROP_VIEWPORT) / 2
    const nextZoom = transform.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08)
    applyZoom(
      nextZoom,
      event.clientX - bounds.left - holeLeft,
      event.clientY - bounds.top - holeTop,
    )
  }

  const display =
    image && transform
      ? getImageDisplaySize(image.naturalWidth, image.naturalHeight, transform.zoom)
      : undefined
  const busy = pending || rotating || uploading

  return {
    applyZoom,
    busy,
    closeDialog,
    cropError,
    display,
    handleApply,
    handleBackToEdit,
    handleRotate,
    handleUpload,
    image,
    loadError,
    onWheel,
    pending,
    previewFile,
    previewUrl,
    resetTransform,
    rotating,
    startPan,
    step,
    transform,
    uploading,
  }
}
