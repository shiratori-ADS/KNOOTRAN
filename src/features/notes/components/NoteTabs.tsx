import { useState } from 'react'
import type { NotePage } from '../../../db/types'

type Props = {
  pages: NotePage[]
  activeId: number | null
  toolbarOpen: boolean
  onToggleToolbar: () => void
  onSelect: (id: number) => void
  onRename: (id: number, title: string) => void
}

export function NoteTabs({ pages, activeId, toolbarOpen, onToggleToolbar, onSelect, onRename }: Props) {
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
              title="ダブルクリックで名前変更"
            >
              {page.title}
            </button>
          )
        })}
      </div>
      {activeId != null ? (
        <div className="noteTabActions">
          <button
            type="button"
            className="noteToolbarToggle"
            onClick={onToggleToolbar}
            aria-expanded={toolbarOpen}
            aria-controls="note-editor-toolbar-panels"
            aria-label={toolbarOpen ? '編集を隠す' : '編集を表示'}
            title={toolbarOpen ? '編集を隠す' : '編集を表示'}
          >
            {toolbarOpen ? '▲' : '▼'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
