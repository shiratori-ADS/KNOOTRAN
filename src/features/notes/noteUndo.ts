const MAX_NOTE_UNDO = 40

export type NoteUndoStack = string[]

export function pushNoteUndoSnapshot(stack: NoteUndoStack, html: string): NoteUndoStack {
  if (stack.length > 0 && stack[stack.length - 1] === html) return stack
  const next = [...stack, html]
  if (next.length > MAX_NOTE_UNDO) return next.slice(next.length - MAX_NOTE_UNDO)
  return next
}

export function popNoteUndoSnapshot(stack: NoteUndoStack): { stack: NoteUndoStack; html: string } | null {
  if (stack.length === 0) return null
  const html = stack[stack.length - 1]
  return { stack: stack.slice(0, -1), html }
}
