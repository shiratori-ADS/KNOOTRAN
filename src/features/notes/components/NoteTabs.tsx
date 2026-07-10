import { useState } from 'react'
import type { NotePage } from '../../../db/types'

type Props = {
  pages: NotePage[]
  activeId: number | null
  onSelect: (id: number) => void
  onAdd: () => void
  onDelete: (id: number) => void
  onRename: (id: number, title: string) => void
}

export function NoteTabs({ pages, activeId, onSelect, onAdd, onDelete, onRename }: Props) {
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  function startRename(page: NotePage) {
    if (page.id == null) return
    setRenamingId(page.id)
    setRenameDraft(page.title)
  }

  function commitRename() {
    if (renamingId == null) return
    onRename(renamingId, renameDraft)
    setRenamingId(null)
    setRenameDraft('')
  }

  const activePage = pages.find((p) => p.id === activeId) ?? null

  return (
    <div className="noteTabsBar">
      <div className="noteTabsScroll">
        {pages.map((page) => {
          const isActive = page.id === activeId
          if (page.id == null) return null

          if (renamingId === page.id) {
            return (
              <input
                key={page.id}
                className="noteTabRenameInput"
                value={renameDraft}
                autoFocus
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') {
                    setRenamingId(null)
                    setRenameDraft('')
                  }
                }}
              />
            )
          }

          return (
            <button
              key={page.id}
              type="button"
              className={isActive ? 'noteTab active' : 'noteTab'}
              onClick={() => onSelect(page.id!)}
              onDoubleClick={() => startRename(page)}
              title="ダブルクリックでも名前変更できます"
            >
              {page.title}
            </button>
          )
        })}
        <button type="button" className="noteTabAdd" onClick={() => void onAdd()} aria-label="ページを追加" title="ページを追加">
          ＋
        </button>
      </div>
      <div className="noteTabActions">
        {activePage ? (
          <button type="button" className="noteTabRename secondary" onClick={() => startRename(activePage)}>
            名前変更
          </button>
        ) : null}
        {activeId != null && pages.length > 1 ? (
          <button
            type="button"
            className="noteTabDelete secondary"
            onClick={() => {
              if (window.confirm('このページを削除しますか？')) void onDelete(activeId)
            }}
          >
            削除
          </button>
        ) : null}
      </div>
    </div>
  )
}
