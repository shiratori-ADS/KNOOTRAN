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
        onAdd={() => void c.addPage()}
        onDelete={(id) => void c.deletePage(id)}
        onRename={c.renamePage}
      />

      {c.activePage?.id != null ? (
        <NoteEditor
          key={c.activePage.id}
          pageId={c.activePage.id}
          content={c.activePage.content}
          toolbarOpen={toolbarOpen}
          onChange={c.updateContent}
        />
      ) : (
        <p className="subtle">ページがありません。「＋」で追加してください。</p>
      )}
    </section>
  )
}
