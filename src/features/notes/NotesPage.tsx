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
        onRename={c.renamePage}
      />

      {c.activePage?.id != null ? (
        <NoteEditor
          key={c.activePage.id}
          pageId={c.activePage.id}
          content={c.activePage.content}
          toolbarOpen={toolbarOpen}
          canDeletePage={c.pages.length > 1}
          onAddPage={() => void c.addPage()}
          onDeletePage={() => {
            if (c.activeId == null) return
            if (!window.confirm('このページを削除しますか？')) return
            void c.deletePage(c.activeId)
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
