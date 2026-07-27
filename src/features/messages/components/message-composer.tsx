import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { createMessage } from '@/api/message'
import { Button } from '@/components/ui/button'
import { upsertChannelMessageFromApi } from '@/features/messages/message-queries'

interface MessageComposerProps {
  canSend: boolean
  channelId: string
  channelName: string
}

export function MessageComposer({ canSend, channelId, channelName }: MessageComposerProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string>()
  const sendMutation = useMutation({
    mutationFn: (content: string) => createMessage({ channelId, content }),
    onSuccess: (message) => {
      upsertChannelMessageFromApi(queryClient, message)
      setDraft('')
      setError(undefined)
    },
    onError: (sendError) => {
      setError(getApiErrorMessage(sendError, 'Unable to send message. Please try again.'))
    },
  })

  const trimmed = draft.trim()
  const disabled = !canSend || sendMutation.isPending || !trimmed

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (disabled) return
    sendMutation.mutate(trimmed)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  if (!canSend) {
    return (
      <div className="border-t border-line px-4 py-3 sm:px-5">
        <p className="rounded-control border border-line bg-surface-raised px-3 py-2.5 text-sm text-muted">
          You do not have permission to send messages in #{channelName}.
        </p>
      </div>
    )
  }

  return (
    <form className="border-t border-line p-3 sm:p-4" onSubmit={submit}>
      <div className="flex items-end gap-2 rounded-control border border-line bg-surface-raised p-1.5 pl-3 focus-within:border-brand">
        <label className="sr-only" htmlFor={`message-composer-${channelId}`}>
          Message #{channelName}
        </label>
        <textarea
          id={`message-composer-${channelId}`}
          rows={1}
          value={draft}
          placeholder={`Message #${channelName}`}
          disabled={sendMutation.isPending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm text-ink outline-none placeholder:text-subtle"
        />
        <Button size="small" type="submit" disabled={disabled} loading={sendMutation.isPending}>
          Send
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-negative">
          {error}
        </p>
      ) : null}
    </form>
  )
}
