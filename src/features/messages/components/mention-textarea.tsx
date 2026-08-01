import { Mention } from '@tiptap/extension-mention'
import type { JSONContent } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'
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

interface EditorSegment {
  atomic: boolean
  displayEnd: number
  displayStart: number
  docEnd: number
  docStart: number
  rawEnd: number
  rawStart: number
  rawText: string
  text: string
}

interface EditorModel {
  displayText: string
  rawValue: string
  segments: EditorSegment[]
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

function rawContentToTiptapContent(content: string, candidates: MentionCandidate[]): JSONContent {
  return {
    content: content.split('\n').map((line) => {
      const layout = createMentionDraftLayout(line, candidates)
      const lineContent = layout.segments.map((segment) =>
        segment.candidate
          ? {
              attrs: {
                id: segment.candidate.id,
                kind: segment.candidate.kind,
                label: segment.candidate.label,
                mentionSuggestionChar: '@',
              },
              type: 'mention',
            }
          : { text: segment.text, type: 'text' },
      )
      return lineContent.length > 0
        ? { content: lineContent, type: 'paragraph' }
        : { type: 'paragraph' }
    }),
    type: 'doc',
  }
}

function readEditorModel(editor: Editor, candidates: MentionCandidate[]): EditorModel {
  const candidateByKey = new Map(
    candidates.map((candidate) => [`${candidate.kind}:${candidate.id}`, candidate]),
  )
  const segments: EditorSegment[] = []
  let rawCursor = 0
  let displayCursor = 0

  const appendSegment = (
    segment: Omit<EditorSegment, 'displayEnd' | 'displayStart' | 'rawEnd' | 'rawStart'> & {
      docEnd: number
      docStart: number
    },
  ) => {
    const previous = segments.at(-1)
    if (previous && !previous.atomic && !segment.atomic && previous.docEnd === segment.docStart) {
      previous.text += segment.text
      previous.rawText += segment.rawText
      previous.displayEnd += segment.text.length
      previous.rawEnd += segment.rawText.length
      previous.docEnd = segment.docEnd
      rawCursor += segment.rawText.length
      displayCursor += segment.text.length
      return
    }

    segments.push({
      ...segment,
      displayEnd: displayCursor + segment.text.length,
      displayStart: displayCursor,
      rawEnd: rawCursor + segment.rawText.length,
      rawStart: rawCursor,
    })
    rawCursor += segment.rawText.length
    displayCursor += segment.text.length
  }

  editor.state.doc.forEach((paragraph, paragraphOffset, paragraphIndex) => {
    if (paragraphIndex > 0) {
      appendSegment({
        atomic: false,
        docEnd: paragraphOffset,
        docStart: paragraphOffset,
        rawText: '\n',
        text: '\n',
      })
    }

    paragraph.forEach((node, offset) => {
      const docStart = paragraphOffset + 1 + offset
      if (node.type.name === 'mention') {
        const kind = node.attrs.kind ?? (node.attrs.id === 'everyone' ? 'everyone' : 'user')
        const candidate = candidateByKey.get(`${kind}:${node.attrs.id}`)
        const rawText = candidate?.token ?? mentionTokenFromAttrs(node.attrs)
        appendSegment({
          atomic: true,
          docEnd: docStart + node.nodeSize,
          docStart,
          rawText,
          text: `@${node.attrs.label ?? node.attrs.id ?? ''}`,
        })
      } else if (node.type.name === 'hardBreak') {
        appendSegment({
          atomic: false,
          docEnd: docStart + node.nodeSize,
          docStart,
          rawText: '\n',
          text: '\n',
        })
      } else if (node.isText) {
        appendSegment({
          atomic: false,
          docEnd: docStart + node.nodeSize,
          docStart,
          rawText: node.text ?? '',
          text: node.text ?? '',
        })
      }
    })
  })

  return {
    displayText: segments.map((segment) => segment.text).join(''),
    rawValue: segments.map((segment) => segment.rawText).join(''),
    segments,
  }
}

function mentionTokenFromAttrs(attrs: { id?: string | null; kind?: string }) {
  if (attrs.kind === 'everyone' || attrs.id === 'everyone') return '@everyone'
  if (attrs.kind === 'role') return `<@&${attrs.id ?? ''}>`
  return `<@${attrs.id ?? ''}>`
}

function editorDocPositionToRawOffset(model: EditorModel, position: number, edge: 'end' | 'start') {
  for (const segment of model.segments) {
    if (position < segment.docStart) return segment.rawStart
    if (position > segment.docEnd) continue
    if (!segment.atomic) {
      return (
        segment.rawStart +
        Math.max(0, Math.min(position - segment.docStart, segment.rawText.length))
      )
    }
    if (position === segment.docStart) return segment.rawStart
    if (position === segment.docEnd) return segment.rawEnd
    return edge === 'end' ? segment.rawEnd : segment.rawStart
  }
  return model.segments.at(-1)?.rawEnd ?? 0
}

function editorDisplayOffsetToDocPosition(
  model: EditorModel,
  displayOffset: number,
  edge: 'end' | 'start',
) {
  const displayLength = model.segments.at(-1)?.displayEnd ?? 0
  const offset = Math.max(0, Math.min(displayOffset, displayLength))
  for (const segment of model.segments) {
    if (offset < segment.displayStart) return segment.docStart
    if (offset > segment.displayEnd) continue
    if (!segment.atomic) {
      return (
        segment.docStart + Math.max(0, Math.min(offset - segment.displayStart, segment.text.length))
      )
    }
    if (offset === segment.displayStart) return segment.docStart
    if (offset === segment.displayEnd) return segment.docEnd
    return edge === 'end' ? segment.docEnd : segment.docStart
  }
  return model.segments.at(-1)?.docEnd ?? 1
}

function setEditorSelection(
  editor: Editor,
  displayStart: number,
  displayEnd: number,
  candidates: MentionCandidate[],
) {
  const model = readEditorModel(editor, candidates)
  const from = editorDisplayOffsetToDocPosition(model, displayStart, 'start')
  const to = editorDisplayOffsetToDocPosition(model, displayEnd, 'end')
  editor.commands.setTextSelection({ from, to })
}

function findAtomicDeletionRange(editor: Editor, key: 'Backspace' | 'Delete') {
  const selection = editor.state.selection
  if (!selection.empty) return undefined

  const { $from } = selection
  const nodes: Array<{ from: number; node: ProseMirrorNode }> = []
  $from.parent.forEach((node, offset) => {
    nodes.push({
      from: $from.start() + offset,
      node,
    })
  })

  if (key === 'Backspace') {
    const current = nodes.find(
      ({ from, node }, index) =>
        selection.from > from &&
        selection.from <= from + node.nodeSize &&
        (node.isText || node.type.name === 'mention') &&
        (selection.from === from + node.nodeSize || index > 0),
    )
    if (current) {
      const index = nodes.indexOf(current)
      const previous = nodes[index - 1]
      if (
        current.node.isText &&
        current.node.text === ' ' &&
        previous?.node.type.name === 'mention'
      ) {
        return { from: previous.from, to: current.from + current.node.nodeSize }
      }
      if (
        current.node.type.name === 'mention' &&
        selection.from === current.from + current.node.nodeSize
      ) {
        return { from: current.from, to: current.from + current.node.nodeSize }
      }
    }
  } else {
    const current = nodes.find(({ from }) => from === selection.from)
    if (current?.node.type.name === 'mention') {
      const index = nodes.indexOf(current)
      const next = nodes[index + 1]
      return {
        from: current.from,
        to:
          next?.node.isText && next.node.text === ' '
            ? next.from + next.node.nodeSize
            : current.from + current.node.nodeSize,
      }
    }
  }

  return undefined
}
