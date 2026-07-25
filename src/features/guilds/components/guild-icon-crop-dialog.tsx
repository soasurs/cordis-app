import * as Dialog from '@radix-ui/react-dialog'
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react'

import { Button } from '@/components/ui/button'

import {
  clampImageOffset,
  cropImageToFile,
  getCenteredOffset,
  getCropAreaFromTransform,
  getImageDisplaySize,
  GUILD_ICON_CROP_STAGE,
  GUILD_ICON_CROP_VIEWPORT,
  GUILD_ICON_MAX_ZOOM,
  GUILD_ICON_MIN_ZOOM,
  loadImageFromFile,
  rotateImageClockwise,
  zoomAroundViewportPoint,
  type ImageCropTransform,
} from '@/features/guilds/crop-image'

interface GuildIconCropDialogProps {
  file: File
  onCancel: () => void
  onConfirm: (file: File) => void
}

type CropStep = 'edit' | 'confirm'

export function GuildIconCropDialog({ file, onCancel, onConfirm }: GuildIconCropDialogProps) {
  const sourceRevokeRef = useRef<(() => void) | undefined>(undefined)
  const workingRevokeRef = useRef<(() => void) | undefined>(undefined)
  const previewUrlRef = useRef<string | undefined>(undefined)
  const [image, setImage] = useState<HTMLImageElement>()
  const [sourceImage, setSourceImage] = useState<HTMLImageElement>()
  const [loadError, setLoadError] = useState<string>()
  const [cropError, setCropError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [transform, setTransform] = useState<ImageCropTransform>()
  const [step, setStep] = useState<CropStep>('edit')
  const [previewFile, setPreviewFile] = useState<File>()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let cancelled = false

    void loadImageFromFile(file)
      .then(({ image: nextImage, revoke }) => {
        if (cancelled) {
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
    const holeLeft = (bounds.width - GUILD_ICON_CROP_VIEWPORT) / 2
    const holeTop = (bounds.height - GUILD_ICON_CROP_VIEWPORT) / 2
    const nextZoom = transform.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08)
    applyZoom(nextZoom, event.clientX - bounds.left - holeLeft, event.clientY - bounds.top - holeTop)
  }

  const display =
    image && transform
      ? getImageDisplaySize(image.naturalWidth, image.naturalHeight, transform.zoom)
      : undefined
  const holeOffset = (GUILD_ICON_CROP_STAGE - GUILD_ICON_CROP_VIEWPORT) / 2
  const busy = pending || rotating || uploading

  return (
    <Dialog.Root
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDialog()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/75 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content
          aria-busy={busy || undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-shell border border-line bg-surface text-ink shadow-panel outline-none"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault()
          }}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="text-base font-semibold tracking-[-0.02em]">
              {step === 'edit' ? 'Edit image' : 'Confirm icon'}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {step === 'edit'
                ? 'Drag to reposition, zoom to frame the icon, and rotate if needed. The cropped image keeps your original format.'
                : 'Review the cropped community icon before uploading it.'}
            </Dialog.Description>
            <button
              type="button"
              aria-label="Close crop dialog"
              disabled={busy}
              className="grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={closeDialog}
            >
              ×
            </button>
          </div>

          {loadError || cropError ? (
            <div
              role="alert"
              className="mx-5 mt-4 rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
            >
              {loadError ?? cropError}
            </div>
          ) : null}

          {step === 'edit' ? (
            <>
              <div
                role="presentation"
                aria-label="Crop viewport"
                className="relative mx-auto mt-4 cursor-grab touch-none overflow-hidden bg-canvas active:cursor-grabbing"
                style={{ height: GUILD_ICON_CROP_STAGE, width: GUILD_ICON_CROP_STAGE }}
                onPointerDown={startPan}
                onWheel={onWheel}
              >
                {image && display && transform ? (
                  <img
                    alt=""
                    draggable={false}
                    src={image.src}
                    className="pointer-events-none absolute max-w-none select-none"
                    style={{
                      height: display.height,
                      left: holeOffset + transform.offsetX,
                      top: holeOffset + transform.offsetY,
                      width: display.width,
                    }}
                  />
                ) : (
                  <div className="grid size-full place-items-center text-sm text-muted">
                    Preparing image…
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-[2.75rem] border-2 border-white"
                  style={{
                    boxShadow: '0 0 0 999px rgb(15 23 42 / 0.55)',
                    height: GUILD_ICON_CROP_VIEWPORT,
                    left: holeOffset,
                    top: holeOffset,
                    width: GUILD_ICON_CROP_VIEWPORT,
                  }}
                />
              </div>

              <div className="mx-auto mt-5 flex w-full max-w-[22rem] items-center gap-3 px-5">
                <span aria-hidden="true" className="text-subtle">
                  <ZoomOutIcon />
                </span>
                <input
                  aria-label="Zoom image"
                  className="min-w-0 flex-1 accent-brand disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!image || !transform || busy}
                  max={GUILD_ICON_MAX_ZOOM}
                  min={GUILD_ICON_MIN_ZOOM}
                  step={0.05}
                  type="range"
                  value={transform?.zoom ?? GUILD_ICON_MIN_ZOOM}
                  onChange={(event) => {
                    applyZoom(
                      Number(event.target.value),
                      GUILD_ICON_CROP_VIEWPORT / 2,
                      GUILD_ICON_CROP_VIEWPORT / 2,
                    )
                  }}
                />
                <span aria-hidden="true" className="text-muted">
                  <ZoomInIcon />
                </span>
                <button
                  type="button"
                  aria-label="Rotate image"
                  disabled={!image || busy}
                  className="ml-1 grid size-9 shrink-0 place-items-center rounded-control text-muted transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={() => void handleRotate()}
                >
                  <RotateIcon />
                </button>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-line px-5 py-4">
                <Button
                  disabled={!image || busy}
                  type="button"
                  variant="ghost"
                  onClick={resetTransform}
                >
                  Reset
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button disabled={busy} type="button" variant="secondary" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!image || !transform || Boolean(loadError) || rotating}
                    loading={pending}
                    type="button"
                    onClick={() => void handleApply()}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mt-8 grid place-items-center px-5">
                <div className="grid size-40 place-items-center overflow-hidden rounded-[2.75rem] border border-line bg-canvas shadow-panel">
                  {previewUrl ? (
                    <img alt="Cropped community icon preview" src={previewUrl} className="size-full object-cover" />
                  ) : null}
                </div>
                <p className="mt-4 max-w-xs text-center text-sm leading-6 text-muted">
                  This is how the community icon will appear. Upload it, or go back to adjust the
                  crop.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 border-t border-line px-5 py-4">
                <Button disabled={pending} type="button" variant="ghost" onClick={handleBackToEdit}>
                  Back
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button disabled={pending} type="button" variant="secondary" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!previewFile || uploading}
                    loading={uploading}
                    type="button"
                    onClick={handleUpload}
                  >
                    Upload
                  </Button>
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ZoomOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11.5 14.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ZoomInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 14.5 18 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function RotateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 4h5.5A2.5 2.5 0 0 1 15 6.5V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="m13 7 2 2 2-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
