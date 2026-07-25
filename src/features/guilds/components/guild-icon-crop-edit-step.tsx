import type { PointerEvent as ReactPointerEvent, WheelEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  RotateIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/features/guilds/components/guild-icon-crop-icons'
import {
  GUILD_ICON_CROP_STAGE,
  GUILD_ICON_CROP_VIEWPORT,
  GUILD_ICON_MAX_ZOOM,
  GUILD_ICON_MIN_ZOOM,
  type ImageCropTransform,
} from '@/features/guilds/crop-image'

interface GuildIconCropEditStepProps {
  applyZoom: (nextZoom: number, viewportX: number, viewportY: number) => void
  busy: boolean
  closeDialog: () => void
  display?: { height: number; width: number }
  handleApply: () => void
  handleRotate: () => void
  image?: HTMLImageElement
  loadError?: string
  onWheel: (event: WheelEvent<HTMLDivElement>) => void
  pending: boolean
  resetTransform: () => void
  rotating: boolean
  startPan: (event: ReactPointerEvent<HTMLDivElement>) => void
  transform?: ImageCropTransform
}

export function GuildIconCropEditStep({
  applyZoom,
  busy,
  closeDialog,
  display,
  handleApply,
  handleRotate,
  image,
  loadError,
  onWheel,
  pending,
  resetTransform,
  rotating,
  startPan,
  transform,
}: GuildIconCropEditStepProps) {
  const holeOffset = (GUILD_ICON_CROP_STAGE - GUILD_ICON_CROP_VIEWPORT) / 2

  return (
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
            // Large shadow punches a transparent hole so only the crop viewport stays bright.
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
          onClick={handleRotate}
        >
          <RotateIcon />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-line px-5 py-4">
        <Button disabled={!image || busy} type="button" variant="ghost" onClick={resetTransform}>
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
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </div>
    </>
  )
}
