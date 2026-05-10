import { useLayoutEffect, useRef } from 'react'
import { DetailEdit, DetailHeader, DetailView, ListPane, useWordbookController, wordbookUi } from '../features/wordbook'

export function Wordbook() {
  const c = useWordbookController()
  const detailScrollRef = useRef<HTMLDivElement | null>(null)

  // 単語の選択が変わったとき・詳細/編集の切り替え時に、右ペイン（またはスマホでは画面）を先頭へ戻す
  useLayoutEffect(() => {
    if (!c.selection.selected?.id) return

    // ページ全体は動かさず、右ペインのスクロールだけ先頭へ戻す
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0

    // スマホ表示はページ全体がスクロール主体なので、画面先頭へ戻す（編集を開いた直後も先頭行が見えるようにする）
    if (c.layout.isMobile) window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [c.selection.selected?.id, c.mode.isEditing])

  return (
    <section className="page">
      <h2>単語帳</h2>
      <div className={c.layout.isMobile ? 'splitMobile' : 'split'}>
        {(!c.layout.isMobile || !c.selection.selected) && (
          <ListPane {...c.list} />
        )}

        {(!c.layout.isMobile || c.selection.selected) && (
          <div className="card detailPane">
          {c.selection.selected ? (
            <div ref={detailScrollRef} className="detailPaneScroll">
              <div className="detail">
                <DetailHeader selected={c.selection.selected} />

                {c.mode.isEditing ? (
                  <DetailEdit {...c.edit} posOptions={wordbookUi.posOptions} />
                ) : (
                  <DetailView {...c.detailViewProps!} />
                )}
              </div>
            </div>
          ) : (
            <p className="subtle">左から単語を選択してください。</p>
          )}
          </div>
        )}
      </div>
    </section>
  )
}

