import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../../db/db'
import type { NotePage } from '../../db/types'
import { markLocalDirty } from '../../lib/cloudAutoSync'

function defaultPageTitle(index: number): string {
  return `ノート ${index}`
}

async function ensureInitialPage(): Promise<NotePage[]> {
  const existing = await db.notePages.orderBy('sortOrder').toArray()
  if (existing.length > 0) return existing

  const now = Date.now()
  const initial: NotePage = {
    title: defaultPageTitle(1),
    content: '',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }
  const id = await db.notePages.add(initial)
  markLocalDirty()
  return [{ ...initial, id }]
}

export function useNotesController() {
  const [pages, setPages] = useState<NotePage[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const saveTimerRef = useRef<number | null>(null)
  const activePage = pages.find((p) => p.id === activeId) ?? null

  const loadPages = useCallback(async () => {
    const all = await ensureInitialPage()
    setPages(all)
    setActiveId((prev) => {
      if (prev != null && all.some((p) => p.id === prev)) return prev
      return all[0]?.id ?? null
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadPages()
  }, [loadPages])

  const scheduleSave = useCallback((pageId: number, patch: Partial<Pick<NotePage, 'title' | 'content'>>) => {
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        const current = await db.notePages.get(pageId)
        if (!current) return
        const next: NotePage = {
          ...current,
          ...patch,
          updatedAt: Date.now(),
        }
        await db.notePages.put(next)
        markLocalDirty()
        setPages((prev) => prev.map((p) => (p.id === pageId ? next : p)))
        setStatus('保存しました')
        window.setTimeout(() => setStatus(''), 1500)
      })()
    }, 500)
  }, [])

  const updateContent = useCallback(
    (content: string) => {
      if (activeId == null) return
      setPages((prev) => prev.map((p) => (p.id === activeId ? { ...p, content } : p)))
      scheduleSave(activeId, { content })
    },
    [activeId, scheduleSave],
  )

  const addPage = useCallback(async () => {
    const all = await db.notePages.orderBy('sortOrder').toArray()
    const now = Date.now()
    const next: NotePage = {
      title: defaultPageTitle(all.length + 1),
      content: '',
      sortOrder: all.length,
      createdAt: now,
      updatedAt: now,
    }
    const id = await db.notePages.add(next)
    markLocalDirty()
    const created = { ...next, id }
    setPages((prev) => [...prev, created])
    setActiveId(id)
  }, [])

  const deletePage = useCallback(
    async (pageId: number) => {
      const all = await db.notePages.orderBy('sortOrder').toArray()
      if (all.length <= 1) return

      await db.notePages.delete(pageId)
      markLocalDirty()

      const remaining = all.filter((p) => p.id !== pageId)
      await Promise.all(
        remaining.map((p, i) =>
          db.notePages.update(p.id!, { sortOrder: i }),
        ),
      )

      const refreshed = remaining.map((p, i) => ({ ...p, sortOrder: i }))
      setPages(refreshed)
      setActiveId((prev) => {
        if (prev === pageId) return refreshed[0]?.id ?? null
        return prev
      })
    },
    [],
  )

  const renamePage = useCallback(
    (pageId: number, title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return
      setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, title: trimmed } : p)))
      scheduleSave(pageId, { title: trimmed })
    },
    [scheduleSave],
  )

  const movePage = useCallback(async (pageId: number, direction: 'up' | 'down') => {
    const all = await db.notePages.orderBy('sortOrder').toArray()
    const idx = all.findIndex((p) => p.id === pageId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= all.length) return

    const next = [...all]
    const tmp = next[idx]!
    next[idx] = next[swapIdx]!
    next[swapIdx] = tmp

    const now = Date.now()
    const refreshed = next.map((p, i) => ({ ...p, sortOrder: i, updatedAt: now }))
    await Promise.all(refreshed.map((p) => db.notePages.put(p)))
    markLocalDirty()
    setPages(refreshed)
  }, [])

  return {
    pages,
    activeId,
    activePage,
    loading,
    status,
    setActiveId,
    updateContent,
    addPage,
    deletePage,
    renamePage,
    movePage,
  }
}
