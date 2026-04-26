import { useMemo, useState } from 'react'
import type { Entry, PartOfSpeech } from '../../../db/types'
import { displayForm, genderLabel, posLabel, posOptions, verbInflectionShortLabel } from '../wordbookHelpers'

export function ListPane({
  filterPos,
  setFilterPos,
  filterTag,
  setFilterTag,
  filterAlpha,
  setFilterAlpha,
  tagOptions,
  sorted,
  totalCount,
  onSelect,
}: {
  filterPos: PartOfSpeech | 'all'
  setFilterPos: (v: PartOfSpeech | 'all') => void
  filterTag: string | 'all'
  setFilterTag: (v: string | 'all') => void
  filterAlpha: string | 'all'
  setFilterAlpha: (v: string | 'all') => void
  tagOptions: string[]
  sorted: Entry[]
  totalCount: number
  onSelect: (e: Entry) => void
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [draftPos, setDraftPos] = useState<PartOfSpeech | 'all'>(filterPos)
  const [draftTag, setDraftTag] = useState<string | 'all'>(filterTag)
  const [draftAlpha, setDraftAlpha] = useState<string | 'all'>(filterAlpha)

  const alphaOptions = useMemo(() => {
    const letters = [
      'Α',
      'Β',
      'Γ',
      'Δ',
      'Ε',
      'Ζ',
      'Η',
      'Θ',
      'Ι',
      'Κ',
      'Λ',
      'Μ',
      'Ν',
      'Ξ',
      'Ο',
      'Π',
      'Ρ',
      'Σ',
      'Τ',
      'Υ',
      'Φ',
      'Χ',
      'Ψ',
      'Ω',
    ]
    return ['#', ...letters] as const
  }, [])

  function openFilter() {
    setDraftPos(filterPos)
    setDraftTag(filterTag)
    setDraftAlpha(filterAlpha)
    setIsFilterOpen(true)
  }

  function applyAndClose() {
    setFilterPos(draftPos)
    setFilterTag(draftTag)
    setFilterAlpha(draftAlpha)
    setIsFilterOpen(false)
  }

  return (
    <div className="card">
      <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="subtle">
          表示件数: {sorted.length}/{totalCount}
        </div>
        <button type="button" className="secondary" onClick={openFilter}>
          フィルター
        </button>
      </div>

      {isFilterOpen && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="フィルター"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) applyAndClose()
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="row wrap" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>フィルター</h3>
              <button type="button" className="secondary" onClick={applyAndClose}>
                閉じる
              </button>
            </div>

            <div className="twoCol">
              <label className="field" style={{ margin: 0 }}>
                <span className="label">品詞</span>
                <select value={draftPos} onChange={(e) => setDraftPos(e.target.value as PartOfSpeech | 'all')}>
                  <option value="all">すべて</option>
                  {posOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span className="label">タグ</span>
                <select value={draftTag} onChange={(e) => setDraftTag(e.target.value as string | 'all')}>
                  <option value="all">すべて</option>
                  {tagOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <span className="label">アルファベット</span>
              <div className="chips">
                <button
                  type="button"
                  className="chipButton mono"
                  aria-pressed={draftAlpha === 'all'}
                  onClick={() => setDraftAlpha('all')}
                  style={{
                    borderColor: draftAlpha === 'all' ? 'var(--accent-border)' : undefined,
                    background: draftAlpha === 'all' ? 'var(--accent-bg)' : undefined,
                  }}
                >
                  すべて
                </button>
                {alphaOptions.map((a) => {
                  const selected = draftAlpha === a
                  return (
                    <button
                      key={a}
                      type="button"
                      className="chipButton mono"
                      aria-pressed={selected}
                      onClick={() => setDraftAlpha(a)}
                      style={{
                        borderColor: selected ? 'var(--accent-border)' : undefined,
                        background: selected ? 'var(--accent-bg)' : undefined,
                      }}
                      title={a === '#' ? 'Α〜Ω以外' : a}
                    >
                      {a}
                    </button>
                  )
                })}
              </div>
              <span className="help">「#」は Α〜Ω 以外（数字・記号など）です。トノス（ά等）は無視して判定します。</span>
            </div>

            <div className="row wrap" style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setDraftPos('all')
                  setDraftTag('all')
                  setDraftAlpha('all')
                }}
              >
                クリア
              </button>
              <button type="button" className="primary" onClick={applyAndClose}>
                適用
              </button>
            </div>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="subtle">まだ単語がありません。まずは「登録」から追加してください。</p>
      ) : (
        <ul className="list">
          {sorted.map((e) => (
            <li key={e.id}>
              <button className="listItem" onClick={() => onSelect(e)}>
                <div className="listTitle mono greek">{displayForm(e.foreignLemma ?? e.foreignForms[0] ?? '(no form)')}</div>
                <div className="listSub">
                  <span className="v">{e.meaningJaVariants?.length ? e.meaningJaVariants.join(' / ') : e.meaningJaPrimary}</span>
                  {e.pos === 'noun' ? (
                    <span className="badge badgePos badgePos-noun">{`${posLabel(e.pos)}:${genderLabel(e.nounGender)}`}</span>
                  ) : e.pos === 'verb' && verbInflectionShortLabel(e.inflectionType) ? (
                    <span className={`badge badgePos badgePos-${e.pos}`}>{`${posLabel(e.pos)} : ${verbInflectionShortLabel(e.inflectionType)}`}</span>
                  ) : (
                    <span className={`badge badgePos badgePos-${e.pos}`}>{posLabel(e.pos)}</span>
                  )}
                  {e.tags?.length ? (
                    <div className="chips">
                      {e.tags.map((t) => (
                        <span key={t} className="chip mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

