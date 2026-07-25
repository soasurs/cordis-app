import * as Dialog from '@radix-ui/react-dialog'

import { GuildIconCropConfirmStep } from '@/features/guilds/components/guild-icon-crop-confirm-step'
import { GuildIconCropEditStep } from '@/features/guilds/components/guild-icon-crop-edit-step'
import { useGuildIconCrop } from '@/features/guilds/components/use-guild-icon-crop'

interface GuildIconCropDialogProps {
  file: File
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function GuildIconCropDialog({ file, onCancel, onConfirm }: GuildIconCropDialogProps) {
  const crop = useGuildIconCrop({ file, onCancel, onConfirm })

  return (
    <Dialog.Root
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          crop.closeDialog()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/75 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content
          aria-busy={crop.busy || undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-shell border border-line bg-surface text-ink shadow-panel outline-none"
          onEscapeKeyDown={(event) => {
            if (crop.busy) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (crop.busy) event.preventDefault()
          }}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="text-base font-semibold tracking-[-0.02em]">
              {crop.step === 'edit' ? 'Edit image' : 'Confirm icon'}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {crop.step === 'edit'
                ? 'Drag to reposition, zoom to frame the icon, and rotate if needed. The cropped image keeps your original format.'
                : 'Review the cropped community icon before uploading it.'}
            </Dialog.Description>
            <button
              type="button"
              aria-label="Close crop dialog"
              disabled={crop.busy}
              className="grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={crop.closeDialog}
            >
              ×
            </button>
          </div>

          {crop.loadError || crop.cropError ? (
            <div
              role="alert"
              className="mx-5 mt-4 rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
            >
              {crop.loadError ?? crop.cropError}
            </div>
          ) : null}

          {crop.step === 'edit' ? (
            <GuildIconCropEditStep
              applyZoom={crop.applyZoom}
              busy={crop.busy}
              closeDialog={crop.closeDialog}
              display={crop.display}
              handleApply={() => void crop.handleApply()}
              handleRotate={() => void crop.handleRotate()}
              image={crop.image}
              loadError={crop.loadError}
              onWheel={crop.onWheel}
              pending={crop.pending}
              resetTransform={crop.resetTransform}
              rotating={crop.rotating}
              startPan={crop.startPan}
              transform={crop.transform}
            />
          ) : (
            <GuildIconCropConfirmStep
              closeDialog={crop.closeDialog}
              handleBackToEdit={crop.handleBackToEdit}
              handleUpload={crop.handleUpload}
              pending={crop.pending}
              previewFile={crop.previewFile}
              previewUrl={crop.previewUrl}
              uploading={crop.uploading}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
