import { useState } from 'react'
import { NoteEditor } from './components/NoteEditor'
import { NoteTabs } from './components/NoteTabs'
import { useNotesController } from './useNotesController'

export function NotesPage() {
  const c = useNotesController()
  const [toolbarOpen, setToolbarOpen] = useState(false)
  if (c.loading) {
    return (
      <section className="page">
        <h2>ノート</h2>
        <p className="subtle">読み込み中…</p>
      </section>
    )
  }

  const activeIndex = c.pages.findIndex((p) => p.id === c.activeId)
  const canMoveUp = activeIndex > 0
  const canMoveDown = activeIndex >= 0 && activeIndex < c.pages.length - 1

  return (
    <section className="page notePage">
      <div className="notePageHeader">
        <h2>ノート</h2>
        {c.status ? <span className="status">{c.status}</span> : null}
      </div>

      <NoteTabs
        pages={c.pages}
        activeId={c.activeId}
        toolbarOpen={toolbarOpen}
        onToggleToolbar={() => setToolbarOpen((open) => !open)}
        onSelect={c.setActiveId}
      />

      {c.activePage?.id != null ? (
        <NoteEditor
          key={c.activePage.id}
          pageId={c.activePage.id}
          content={c.activePage.content}
          pageTitle={c.activePage.title}
          toolbarOpen={toolbarOpen}
          canDeletePage={c.pages.length > 1}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onAddPage={() => void c.addPage()}
          onDeletePage={() => {
            if (c.activeId == null) return
            if (!window.confirm('このページを削除しますか？')) return
            void c.deletePage(c.activeId)
          }}
          onRenamePage={(title) => {
            if (c.activeId == null) return
            c.renamePage(c.activeId, title)
          }}
          onMovePage={(direction) => {
            if (c.activeId == null) return
            void c.movePage(c.activeId, direction)
          }}
          onChange={c.updateContent}
        />
      ) : (
        <div className="noteEmptyState">
          <p className="subtle">ページがありません。下の「＋」で追加してください。</p>
          <button type="button" className="noteToolbarBtn secondary" onClick={() => void c.addPage()} aria-label="ページを追加">
            ＋ ページを追加
          </button>
        </div>
      )}
    </section>
  )
}
