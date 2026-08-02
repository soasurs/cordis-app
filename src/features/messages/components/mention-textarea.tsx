import { Mention } from '@tiptap/extension-mention'
import type { JSONContent } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type FormEventHandler,
  type HTMLAttributes,
  type KeyboardEvent,
  type KeyboardEventHandler,
} from 'react'

import {
  createMentionDraftLayout,
  mentionRawOffsetToDisplayOffset,
  type MentionCandidate,
  type MentionEditorHandle,
} from '@/features/messages/mentions'
import {
  editorDocPositionToRawOffset,
  findAtomicDeletionRange,
  rawContentToTiptapContent,
  readEditorModel,
  setEditorSelection,
} from '@/features/messages/components/mention-editor-model'

interface MentionTextareaProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onInput' | 'onKeyDown' | 'onPaste' | 'onSelect'
> {
  disabled?: boolean
  mentionCandidates: MentionCandidate[]
  onInput?: FormEventHandler<HTMLDivElement>
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
  onPaste?: (event: ClipboardEvent<HTMLDivElement>) => void
  onRawChange?: (value: string, selectionStart: number, selectionEnd: number) => void
  onRawSelect?: (value: string, selectionStart: number, selectionEnd: number) => void
  placeholder?: string
  value?: string
}

interface PendingSelection {
  end: number
  start: number
  value: string
}

const MentionNode = Mention.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      kind: {
        default: 'user',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-kind') ?? 'user',
        renderHTML: (attributes: { kind?: string }) => ({
          'data-kind': attributes.kind ?? 'user',
        }),
      },
    }
  },

  // The existing React mention picker owns suggestions. Tiptap still owns the document,
  // inline atom, cursor mapping and deletion behavior.
  addProseMirrorPlugins() {
    return []
  },
})

const MentionExtension = MentionNode.configure({
  HTMLAttributes: {
    class: 'rounded-md bg-brand-soft px-1.5 py-0.5 align-middle text-brand-text',
  },
  deleteTriggerWithBackspace: true,
  renderHTML: ({ options, node }) => [
    'span',
    options.HTMLAttributes,
    `@${node.attrs.label ?? node.attrs.id ?? ''}`,
  ],
  renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id ?? ''}`,
  suggestion: {
    char: '@',
    items: () => [],
  },
})

export const MentionTextarea = forwardRef<MentionEditorHandle, MentionTextareaProps>(
  function MentionTextarea(
    {
      className,
      disabled = false,
      id,
      mentionCandidates,
      onInput,
      onKeyDown,
      onPaste,
      onRawChange,
      onRawSelect,
      placeholder,
      role,
      value,
      ...props
    },
    forwardedRef,
  ) {
    const rawValue = String(value ?? '')
    const callbacksRef = useRef({
      mentionCandidates,
      onInput,
      onKeyDown,
      onPaste,
      onRawChange,
      onRawSelect,
    })
    callbacksRef.current = {
      mentionCandidates,
      onInput,
      onKeyDown,
      onPaste,
      onRawChange,
      onRawSelect,
    }

    const pendingSelectionRef = useRef<PendingSelection | undefined>(undefined)
    const lastSelectionRef = useRef<PendingSelection | undefined>(undefined)
    const localChangePendingRef = useRef(false)
    const programmaticRawValueRef = useRef<string | undefined>(undefined)
    const editorRef = useRef<Editor | null>(null)
    const initialContentRef = useRef<JSONContent | undefined>(undefined)
    if (!initialContentRef.current) {
      // The editor is initialized once. Subsequent value changes are synchronized below.
      initialContentRef.current = rawContentToTiptapContent(rawValue, mentionCandidates)
    }
    const editor = useEditor(
      {
        content: initialContentRef.current,
        editorProps: {
          attributes: {
            ...getEditorAttributes(props, {
              class: `block max-h-full min-h-0 w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent text-ink outline-none ${className ?? ''}`,
              disabled,
              id,
              role,
            }),
          },
          handleDOMEvents: {
            keydown: (_view, event) => {
              const currentEditor = editorRef.current
              if (!currentEditor || !(event instanceof globalThis.KeyboardEvent)) return false

              if (event.key === 'Backspace' || event.key === 'Delete') {
                const deletion = findAtomicDeletionRange(currentEditor, event.key)
                if (deletion) {
                  event.preventDefault()
                  currentEditor.commands.deleteRange(deletion)
                  return true
                }
              }

              callbacksRef.current.onKeyDown?.(event as unknown as KeyboardEvent<HTMLDivElement>)
              return event.defaultPrevented
            },
            mousedown: (view, event) => {
              if (hasLayoutSupport(view)) return false
              event.preventDefault()
              view.dom.focus()
              return true
            },
            paste: (_view, event) => {
              if (
                typeof globalThis.ClipboardEvent === 'undefined' ||
                !(event instanceof globalThis.ClipboardEvent)
              ) {
                return false
              }
              callbacksRef.current.onPaste?.(event as unknown as ClipboardEvent<HTMLDivElement>)
              return event.defaultPrevented
            },
          },
          handleScrollToSelection: (view) => !hasLayoutSupport(view),
        },
        extensions: [Document, Paragraph, Text, HardBreak, MentionExtension],
        onCreate: ({ editor: createdEditor }) => {
          editorRef.current = createdEditor
        },
        onSelectionUpdate: ({ editor: updatedEditor }) => {
          emitEditorSelection(updatedEditor, callbacksRef.current)
        },
        onUpdate: ({ editor: updatedEditor }) => {
          emitEditorChange(
            updatedEditor,
            callbacksRef.current,
            pendingSelectionRef,
            lastSelectionRef,
            localChangePendingRef,
            programmaticRawValueRef,
          )
        },
      },
      [],
    )
    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: () => {
          editor?.commands.focus(null, { scrollIntoView: false })
        },
        setSelectionRange: (selectionStart, selectionEnd) => {
          if (!editor) return
          setEditorSelection(editor, selectionStart, selectionEnd, mentionCandidates)
        },
      }),
      [editor, mentionCandidates],
    )

    useLayoutEffect(() => {
      if (!editor) return
      editorRef.current = editor
      editor.setEditable(!disabled)

      const editorElement = editor.view.dom as HTMLElement
      const editorAttributes = getEditorAttributes(props, {
        class: `block max-h-full min-h-0 w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent text-ink outline-none ${className ?? ''}`,
        disabled,
        id,
        role,
      })
      for (const attribute of [...editorElement.attributes]) {
        if (attribute.name.startsWith('aria-') || attribute.name.startsWith('data-')) {
          if (!(attribute.name in editorAttributes)) editorElement.removeAttribute(attribute.name)
        }
      }
      for (const [name, attributeValue] of Object.entries(editorAttributes)) {
        editorElement.setAttribute(name, attributeValue)
      }

      const expectedLayout = createMentionDraftLayout(rawValue, mentionCandidates)
      const currentModel = readEditorModel(editor, mentionCandidates)
      const matchesValue =
        currentModel.rawValue === rawValue &&
        currentModel.displayText === expectedLayout.displayText
      if (localChangePendingRef.current) {
        if (matchesValue) localChangePendingRef.current = false
      } else if (!matchesValue) {
        programmaticRawValueRef.current = rawValue
        editor.commands.setContent(rawContentToTiptapContent(rawValue, mentionCandidates), {
          emitUpdate: false,
        })
      }

      const pendingSelection = pendingSelectionRef.current
      if (pendingSelection?.value === rawValue) {
        const layout = createMentionDraftLayout(rawValue, mentionCandidates)
        setEditorSelection(
          editor,
          mentionRawOffsetToDisplayOffset(layout, pendingSelection.start),
          mentionRawOffsetToDisplayOffset(layout, pendingSelection.end),
          mentionCandidates,
        )
        pendingSelectionRef.current = undefined
      } else if (pendingSelection) {
        pendingSelectionRef.current = undefined
      }
    }, [className, disabled, editor, id, mentionCandidates, props, rawValue, role])

    return (
      <div className="relative min-w-0 flex-1">
        {!rawValue && placeholder ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden py-2 text-sm leading-5 text-subtle"
          >
            {placeholder}
          </span>
        ) : null}
        <EditorContent
          editor={editor}
          className="relative z-10 min-w-0"
          onInput={(event) => {
            callbacksRef.current.onInput?.(event)
          }}
        />
      </div>
    )
  },
)

function getEditorAttributes(
  props: object,
  options: { class: string; disabled: boolean; id?: string; role?: string },
) {
  const attributes: Record<string, string> = {
    'aria-disabled': options.disabled ? 'true' : 'false',
    'aria-multiline': 'true',
    class: options.class,
    role: options.role ?? 'textbox',
  }
  if (options.id) attributes.id = options.id

  for (const [name, value] of Object.entries(props)) {
    if (!name.startsWith('aria-') && !name.startsWith('data-')) continue
    if (value === undefined || value === null) continue
    attributes[name] = String(value)
  }
  return attributes
}

function hasLayoutSupport(view: Editor['view']) {
  return typeof view.dom.ownerDocument.elementFromPoint === 'function'
}

function emitEditorChange(
  editor: Editor,
  callbacks: {
    mentionCandidates: MentionCandidate[]
    onInput?: FormEventHandler<HTMLDivElement>
    onKeyDown?: KeyboardEventHandler<HTMLDivElement>
    onPaste?: (event: ClipboardEvent<HTMLDivElement>) => void
    onRawChange?: (value: string, selectionStart: number, selectionEnd: number) => void
    onRawSelect?: (value: string, selectionStart: number, selectionEnd: number) => void
  },
  pendingSelectionRef: { current: PendingSelection | undefined },
  lastSelectionRef: { current: PendingSelection | undefined },
  localChangePendingRef: { current: boolean },
  programmaticRawValueRef: { current: string | undefined },
) {
  const model = readEditorModel(editor, callbacks.mentionCandidates)
  if (programmaticRawValueRef.current !== undefined) {
    if (model.rawValue === programmaticRawValueRef.current) return
    programmaticRawValueRef.current = undefined
  }
  const selection = editor.state.selection
  const selectionStart = editorDocPositionToRawOffset(model, selection.from, 'start')
  const selectionEnd = editorDocPositionToRawOffset(model, selection.to, 'end')
  const pendingSelection = { end: selectionEnd, start: selectionStart, value: model.rawValue }
  const previousSelection = lastSelectionRef.current
  if (
    previousSelection?.value === pendingSelection.value &&
    previousSelection.start === pendingSelection.start &&
    previousSelection.end === pendingSelection.end
  ) {
    return
  }
  localChangePendingRef.current = true
  pendingSelectionRef.current = pendingSelection
  lastSelectionRef.current = pendingSelection
  callbacks.onRawChange?.(model.rawValue, selectionStart, selectionEnd)
}

function emitEditorSelection(
  editor: Editor,
  callbacks: {
    mentionCandidates: MentionCandidate[]
    onRawSelect?: (value: string, selectionStart: number, selectionEnd: number) => void
  },
) {
  const model = readEditorModel(editor, callbacks.mentionCandidates)
  const selection = editor.state.selection
  const selectionStart = editorDocPositionToRawOffset(model, selection.from, 'start')
  const selectionEnd = editorDocPositionToRawOffset(model, selection.to, 'end')
  callbacks.onRawSelect?.(model.rawValue, selectionStart, selectionEnd)
}
