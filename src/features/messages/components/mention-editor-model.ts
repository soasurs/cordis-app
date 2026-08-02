import type { Editor, JSONContent } from '@tiptap/core'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

import { createMentionDraftLayout, type MentionCandidate } from '@/features/messages/mentions'

export interface EditorSegment {
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

export interface EditorModel {
  displayText: string
  rawValue: string
  segments: EditorSegment[]
}

export function rawContentToTiptapContent(
  content: string,
  candidates: MentionCandidate[],
): JSONContent {
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

export function readEditorModel(editor: Editor, candidates: MentionCandidate[]): EditorModel {
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

export function editorDocPositionToRawOffset(
  model: EditorModel,
  position: number,
  edge: 'end' | 'start',
) {
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

export function setEditorSelection(
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

export function findAtomicDeletionRange(editor: Editor, key: 'Backspace' | 'Delete') {
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
