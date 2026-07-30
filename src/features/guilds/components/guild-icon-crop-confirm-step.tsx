import { Button } from '@/components/ui/button'

interface GuildIconCropConfirmStepProps {
  closeDialog: () => void
  confirmCopy: string
  confirmImageAlt: string
  confirmLabel: string
  handleBackToEdit: () => void
  handleUpload: () => void
  pending: boolean
  previewFile?: File
  previewUrl?: string
  uploading: boolean
}

export function GuildIconCropConfirmStep({
  closeDialog,
  confirmCopy,
  confirmImageAlt,
  confirmLabel,
  handleBackToEdit,
  handleUpload,
  pending,
  previewFile,
  previewUrl,
  uploading,
}: GuildIconCropConfirmStepProps) {
  return (
    <>
      <div className="mx-auto mt-8 grid place-items-center px-5">
        <div className="grid size-40 place-items-center overflow-hidden rounded-[2.75rem] border border-line bg-canvas shadow-panel">
          {previewUrl ? (
            <img alt={confirmImageAlt} src={previewUrl} className="size-full object-cover" />
          ) : null}
        </div>
        <p className="mt-4 max-w-xs text-center text-sm leading-6 text-muted">{confirmCopy}</p>
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
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  )
}
