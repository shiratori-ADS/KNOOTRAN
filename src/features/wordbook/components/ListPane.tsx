import { useMemo, useState } from 'react'
import type { Entry, NounGender, PartOfSpeech } from '../../../db/types'
import {
  displayForm,
  genderLabel,
  nounGenderOptions,
  posLabel,
  posOptions,
  verbInflectionFamilyOptions,
  verbInflectionShortLabel,
  type VerbInflectionFamily,
} from '../wordbookHelpers'

function FilterIcon() {
  return (
    <svg
      className="iconButtonIcon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      className="iconButtonIcon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function ListPane({
  filterPos,
  setFilterPos,
  filterTag,
  setFilterTag,
  filterAlphas,
  setFilterAlphas,
  filterNounGenders,
  setFilterNounGenders,
  filterVerbFamilies,
  setFilterVerbFamilies,
  tagOptions,
  sorted,
  totalCount,
  onSelect,
}: {
  filterPos: PartOfSpeech | 'all'
  setFilterPos: (v: PartOfSpeech | 'all') => void
  filterTag: string | 'all'
  setFilterTag: (v: string | 'all') => void
  filterAlphas: string[]
  setFilterAlphas: (v: string[]) => void
  filterNounGenders: NounGender[]
  setFilterNounGenders: (v: NounGender[]) => void
  filterVerbFamilies: VerbInflectionFamily[]
  setFilterVerbFamilies: (v: VerbInflectionFamily[]) => void
  tagOptions: string[]
  sorted: Entry[]
  totalCount: number
  onSelect: (e: Entry) => void
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [draftPos, setDraftPos] = useState<PartOfSpeech | 'all'>(filterPos)
  const [draftTag, setDraftTag] = useState<string | 'all'>(filterTag)
  const [draftAlphas, setDraftAlphas] = useState<string[]>(filterAlphas)
  const [draftNounGenders, setDraftNounGenders] = useState<NounGender[]>(filterNounGenders)
  const [draftVerbFamilies, setDraftVerbFamilies] = useState<VerbInflectionFamily[]>(filterVerbFamilies)

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
    setDraftAlphas([...filterAlphas])
    setDraftNounGenders([...filterNounGenders])
    setDraftVerbFamilies([...filterVerbFamilies])
    setIsFilterOpen(true)
  }

  function applyAndClose() {
    setFilterPos(draftPos)
    setFilterTag(draftTag)
    setFilterAlphas([...draftAlphas])
    setFilterNounGenders(draftPos === 'noun' ? [...draftNounGenders] : [])
    setFilterVerbFamilies(draftPos === 'verb' ? [...draftVerbFamilies] : [])
    setIsFilterOpen(false)
  }

  const hasPosSubFilter =
    (filterPos === 'noun' && filterNounGenders.length > 0) ||
    (filterPos === 'verb' && filterVerbFamilies.length > 0)
  const hasActiveFilter =
    filterPos !== 'all' || filterTag !== 'all' || filterAlphas.length > 0 || hasPosSubFilter

  function toggleDraftAlpha(letter: string) {
    setDraftAlphas((prev) => (prev.includes(letter) ? prev.filter((x) => x !== letter) : [...prev, letter]))
  }

  function toggleDraftNounGender(g: NounGender) {
    setDraftNounGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  function toggleDraftVerbFamily(f: VerbInflectionFamily) {
    setDraftVerbFamilies((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  }

  function onDraftPosChange(v: PartOfSpeech | 'all') {
    setDraftPos(v)
    if (v !== 'noun') setDraftNounGenders([])
    if (v !== 'verb') setDraftVerbFamilies([])
  }

  return (
    <div className="card listPane">
      <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="subtle">
          表示件数: {sorted.length}/{totalCount}
        </div>
        <button
          type="button"
          className={hasActiveFilter ? 'iconButton iconButton--active' : 'iconButton'}
          onClick={openFilter}
          aria-label="フィルター"
          title="フィルター"
        >
          <FilterIcon />
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
            <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>フィルター</h3>
              <button
                type="button"
                className="iconButton"
                onClick={applyAndClose}
                aria-label="閉じる"
                title="閉じる"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="twoCol">
              <label className="field" style={{ margin: 0 }}>
                <span className="label">品詞</span>
                <select value={draftPos} onChange={(e) => onDraftPosChange(e.target.value as PartOfSpeech | 'all')}>
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

            {draftPos === 'noun' && (
              <div className="field" style={{ marginBottom: 0 }}>
                <span className="label">性別</span>
                <div className="chips">
                  <button
                    type="button"
                    className="chipButton"
                    aria-pressed={draftNounGenders.length === 0}
                    onClick={() => setDraftNounGenders([])}
                    style={{
                      borderColor: draftNounGenders.length === 0 ? 'var(--accent-border)' : undefined,
                      background: draftNounGenders.length === 0 ? 'var(--accent-bg)' : undefined,
                    }}
                  >
                    すべて
                  </button>
                  {nounGenderOptions.map((o) => {
                    const selected = draftNounGenders.includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        className="chipButton"
                        aria-pressed={selected}
                        onClick={() => toggleDraftNounGender(o.value)}
                        style={{
                          borderColor: selected ? 'var(--accent-border)' : undefined,
                          background: selected ? 'var(--accent-bg)' : undefined,
                        }}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {draftPos === 'verb' && (
              <div className="field" style={{ marginBottom: 0 }}>
                <span className="label">タイプ</span>
                <div className="chips">
                  <button
                    type="button"
                    className="chipButton mono"
                    aria-pressed={draftVerbFamilies.length === 0}
                    onClick={() => setDraftVerbFamilies([])}
                    style={{
                      borderColor: draftVerbFamilies.length === 0 ? 'var(--accent-border)' : undefined,
                      background: draftVerbFamilies.length === 0 ? 'var(--accent-bg)' : undefined,
                    }}
                  >
                    すべて
                  </button>
                  {verbInflectionFamilyOptions.map((o) => {
                    const selected = draftVerbFamilies.includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        className="chipButton mono"
                        aria-pressed={selected}
                        onClick={() => toggleDraftVerbFamily(o.value)}
                        style={{
                          borderColor: selected ? 'var(--accent-border)' : undefined,
                          background: selected ? 'var(--accent-bg)' : undefined,
                        }}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="field" style={{ marginBottom: 0 }}>
              <span className="label">アルファベット</span>
              <div className="chips">
                <button
                  type="button"
                  className="chipButton mono"
                  aria-pressed={draftAlphas.length === 0}
                  onClick={() => setDraftAlphas([])}
                  style={{
                    borderColor: draftAlphas.length === 0 ? 'var(--accent-border)' : undefined,
                    background: draftAlphas.length === 0 ? 'var(--accent-bg)' : undefined,
                  }}
                >
                  すべて
                </button>
                {alphaOptions.map((a) => {
                  const selected = draftAlphas.includes(a)
                  return (
                    <button
                      key={a}
                      type="button"
                      className="chipButton mono"
                      aria-pressed={selected}
                      onClick={() => toggleDraftAlpha(a)}
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
                  setDraftAlphas([])
                  setDraftNounGenders([])
                  setDraftVerbFamilies([])
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
        <div className="listPaneScroll">
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
        </div>
      )}
    </div>
  )
}

