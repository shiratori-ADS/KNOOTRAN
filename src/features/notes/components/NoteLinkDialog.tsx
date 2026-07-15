import { useEffect, useMemo, useState } from 'react'
import { db } from '../../../db/db'
import type { Entry } from '../../../db/types'
import { findEntriesByNormalizedForeign, wordbookEntryHref } from '../../../lib/entryForeignLookup'
import { normalizeToken } from '../../../lib/normalize'
import { posLabel } from '../../wordbook/wordbookHelpers'

type Props = {
  open: boolean
  selectedText: string
  onClose: () => void
  onInsertLink: (href: string) => void
  onRemoveLink: () => void
}

function entryMatchesQuery(e: Entry, q: string): boolean {
  if (!q) return true
  const lemma = normalizeToken(e.foreignLemma ?? '')
  if (lemma.includes(q)) return true
  if ((e.foreignForms ?? []).some((f) => normalizeToken(f).includes(q))) return true
  if (normalizeToken(e.meaningJaPrimary).includes(q)) return true
  if ((e.meaningJaVariants ?? []).some((m) => normalizeToken(m).includes(q))) return true
  return false
}

export function NoteLinkDialog({ open, selectedText, onClose, onInsertLink, onRemoveLink }: Props) {
  const [query, setQuery] = useState('')
  const [exactHits, setExactHits] = useState<Entry[]>([])
  const [searchHits, setSearchHits] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)

  const trimmedSelection = selectedText.trim()
  const normSelection = useMemo(() => normalizeToken(trimmedSelection), [trimmedSelection])

  useEffect(() => {
    if (!open) return
    setQuery(trimmedSelection)
    setExactHits([])
    setSearchHits([])

    let alive = true
    void (async () => {
      setLoading(true)
      try {
        const exact = normSelection ? await findEntriesByNormalizedForeign(normSelection) : []
        if (!alive) return
        setExactHits(exact)

        const q = normalizeToken(trimmedSelection)
        if (!q) {
          setSearchHits([])
          return
        }
        const all = await db.entries.toArray()
        if (!alive) return
        const exactIds = new Set(exact.map((e) => e.id))
        const rest = all
          .filter((e) => e.id != null && !exactIds.has(e.id) && entryMatchesQuery(e, q))
          .slice(0, 30)
        setSearchHits(rest)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [open, trimmedSelection, normSelection])

  useEffect(() => {
    if (!open) return
    const q = normalizeToken(query)
    let alive = true
    const t = window.setTimeout(() => {
      void (async () => {
        if (!q) {
          if (alive) setSearchHits([])
          return
        }
        const all = await db.entries.toArray()
        if (!alive) return
        const exactIds = new Set(exactHits.map((e) => e.id))
        setSearchHits(
          all.filter((e) => e.id != null && !exactIds.has(e.id) && entryMatchesQuery(e, q)).slice(0, 30),
        )
      })()
    }, 180)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [open, query, exactHits])

  if (!open) return null

  function insertEntryLink(entry: Entry) {
    if (entry.id == null) return
    onInsertLink(wordbookEntryHref(entry.id))
    onClose()
  }

  return (
    <div className="noteDialogBackdrop" role="presentation" onClick={onClose}>
      <div className="noteDialog card" role="dialog" aria-label="リンクの挿入" onClick={(e) => e.stopPropagation()}>
        <h3 className="noteDialogTitle">単語帳リンク</h3>
        {trimmedSelection ? (
          <p className="noteLinkSelectedText">
            選択中: <span className="greek">{trimmedSelection}</span>
          </p>
        ) : (
          <p className="subtle">文字を選択してからリンクを付けてください。</p>
        )}

        <section className="noteLinkSection">
          {loading ? <p className="subtle">検索中…</p> : null}
          {exactHits.length > 0 ? (
            <ul className="noteDialogList" aria-label="完全一致">
              {exactHits.map((e) => (
                <li key={e.id}>
                  <button type="button" className="noteDialogItem" onClick={() => insertEntryLink(e)}>
                    <span className="noteDialogLemma greek">{e.foreignLemma || e.foreignForms[0] || '(無題)'}</span>
                    <span className="noteDialogMeaning">
                      {posLabel(e.pos)} · {e.meaningJaPrimary}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="subtle">{trimmedSelection ? '完全一致する単語はありません。' : null}</p>
          )}

          <input
            className="noteDialogSearch"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="単語帳を検索（見出し・別形・意味）"
            aria-label="単語帳を検索"
          />
          {searchHits.length > 0 ? (
            <ul className="noteDialogList" aria-label="検索結果">
              {searchHits.map((e) => (
                <li key={e.id}>
                  <button type="button" className="noteDialogItem" onClick={() => insertEntryLink(e)}>
                    <span className="noteDialogLemma greek">{e.foreignLemma || e.foreignForms[0] || '(無題)'}</span>
                    <span className="noteDialogMeaning">
                      {posLabel(e.pos)} · {e.meaningJaPrimary}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() && !loading ? (
            <p className="subtle">検索結果はありません。</p>
          ) : null}
        </section>

        <div className="row wrap">
          <button
            type="button"
            className="secondary"
            disabled={!trimmedSelection}
            onClick={() => {
              onRemoveLink()
              onClose()
            }}
          >
            リンク解除
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
