import { useEffect, useMemo, useState } from 'react'
import { db, getSettings } from '../db/db'
import type { Entry, InflectionType, NounGender, PartOfSpeech, Settings } from '../db/types'
import { normalizeToken } from '../lib/normalize'
import { inferNounInflectionTypeFromLemma } from '../grammar/infer'
import { nounGenderOptions, verbInflectionOptions } from '../features/wordbook/wordbookHelpers'
import { parseExamplePairsText } from '../lib/examples'

const posOptions: Array<{ value: PartOfSpeech; label: string }> = [
  { value: 'noun', label: '名詞' },
  { value: 'pronoun_personal', label: '人称代名詞' },
  { value: 'pronoun_interrogative', label: '疑問詞' },
  { value: 'adjective', label: '形容詞' },
  { value: 'verb', label: '動詞' },
  { value: 'preposition', label: '前置詞' },
  { value: 'conjunction', label: '接続詞' },
  { value: 'adverb', label: '副詞' },
  { value: 'other', label: 'その他' },
]

function splitLines(s: string): string[] {
  return s
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
}

export function Register() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [pos, setPos] = useState<PartOfSpeech>('noun')
  const [nounGender, setNounGender] = useState<NounGender>('masc')
  const [inflectionType, setInflectionType] = useState<InflectionType>('none')
  const [meaningJaText, setMeaningJaText] = useState('')
  const [foreignLemma, setForeignLemma] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [examplesText, setExamplesText] = useState('')
  const [relatedText, setRelatedText] = useState('')
  const [memo, setMemo] = useState('')
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const tagOptions = useMemo(() => (settings?.tags ?? []).slice().sort((a, b) => a.localeCompare(b)), [settings?.tags])

  function toggleTag(t: string) {
    setTags((prev) => {
      const cur = prev ?? []
      return cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
    })
  }

  async function onSave() {
    setStatus('')
    const meaningsRaw = splitLines(meaningJaText)
    const meanings = Array.from(new Set(meaningsRaw.map(normalizeToken))).filter(Boolean)
    if (meanings.length === 0) {
      setStatus('「意味（日本語）」は必須です。')
      return
    }

    if (foreignLemma.trim() === '') {
      setStatus('「登録する単語」は必須です。')
      return
    }

    const now = Date.now()
    const lemmaNorm = foreignLemma.trim() ? normalizeToken(foreignLemma) : ''
    if (lemmaNorm) {
      const byLemma = await db.entries.where('foreignLemma').equals(lemmaNorm).first()
      const byForm = await db.entries.where('foreignForms').equals(lemmaNorm).first()
      if (byLemma?.id != null || byForm?.id != null) {
        setModalMessage(`「${foreignLemma.trim()}」は既に単語帳に登録されています。`)
        return
      }
    }
    const entry: Entry = {
      pos,
      meaningJaPrimary: meanings[0],
      meaningJaVariants: meanings,
      tags: tags ?? [],
      memo: memo.trim() ? memo : '',
      nounGender: pos === 'noun' ? nounGender : undefined,
      inflectionType:
        pos === 'verb'
          ? inflectionType
          : pos === 'noun'
            ? inferNounInflectionTypeFromLemma(lemmaNorm, nounGender)
            : 'none',
      foreignLemma: lemmaNorm ? lemmaNorm : undefined,
      foreignForms: lemmaNorm ? [lemmaNorm] : [],
      examples: parseExamplePairsText(examplesText),
      related: splitLines(relatedText),
      createdAt: now,
      updatedAt: now,
    }

    await db.entries.add(entry)
    setMeaningJaText('')
    setForeignLemma('')
    setTags([])
    setExamplesText('')
    setRelatedText('')
    setMemo('')
    setNounGender('masc')
    setInflectionType('none')
    setStatus('保存しました。')
  }

  return (
    <section className="page">
      <h2>登録</h2>
      {modalMessage && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="メッセージ"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalMessage(null)
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>メッセージ</h3>
            <div className="output" style={{ marginBottom: 12 }}>
              {modalMessage}
            </div>
            <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="primary" onClick={() => setModalMessage(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="card">
        <label className="field">
          <span className="label">登録する単語（辞書形・基本形）</span>
          <input value={foreignLemma} onChange={(e) => setForeignLemma(e.target.value)} placeholder="例：αγοράζω / μήλο" />
        </label>

        <label className="field">
          <span className="label">品詞</span>
          <select
            value={pos}
            onChange={(e) => {
              const next = e.target.value as PartOfSpeech
              setPos(next)
              if (next === 'verb') setInflectionType('verb_pres_act_-ω')
              else setInflectionType('none')
            }}
          >
            {posOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {pos === 'verb' && (
          <label className="field">
            <span className="label">活用タイプ</span>
            <select value={inflectionType} onChange={(e) => setInflectionType(e.target.value as InflectionType)}>
              {verbInflectionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {pos === 'noun' && (
          <label className="field">
            <span className="label">性（名詞）</span>
            <select value={nounGender} onChange={(e) => setNounGender(e.target.value as NounGender)}>
              {nounGenderOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span className="label">意味（複数OK・改行区切り）</span>
          <textarea
            value={meaningJaText}
            onChange={(e) => setMeaningJaText(e.target.value)}
            placeholder={'例：\n解く\n解放する\nほどく'}
            rows={3}
          />
        </label>

        <div className="twoCol">
          <label className="field">
            <span className="label">例文（任意・複数行）</span>
            <textarea
              value={examplesText}
              onChange={(e) => setExamplesText(e.target.value)}
              rows={4}
              placeholder={'例：\nτο κόκκινο μήλο\t赤いりんご\nΠονάει το κεφάλι μου.\t頭が痛い。'}
            />
            <span className="help">1行につき「原文[TAB]訳」。TABの代わりに「→」「=&gt;」「-&gt;」もOK。</span>
          </label>
          <label className="field">
            <span className="label">関連語（任意・複数行）</span>
            <textarea value={relatedText} onChange={(e) => setRelatedText(e.target.value)} rows={4} />
            {/* PCで例文欄と高さを揃えるためのスペーサー（例文側のhelpと同じ高さ） */}
            <span className="help" style={{ visibility: 'hidden' }} aria-hidden="true">
              1行につき「原文[TAB]訳」。TABの代わりに「→」「=&gt;」「-&gt;」もOK。
            </span>
          </label>
        </div>

        <label className="field">
          <span className="label">タグ（任意・複数OK）</span>
          {tagOptions.length ? (
            <div className="chips">
              {tagOptions.map((t) => {
                const selected = (tags ?? []).includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    className="chipButton mono"
                    aria-pressed={selected}
                    onClick={() => toggleTag(t)}
                    style={{
                      borderColor: selected ? 'var(--accent-border)' : undefined,
                      background: selected ? 'var(--accent-bg)' : undefined,
                    }}
                    title="タップでON/OFF"
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="subtle">（タグが未設定です。「設定」→「タグ設定」で追加してください）</div>
          )}
        </label>

        <label className="field">
          <span className="label">メモ（任意）</span>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} placeholder="例：覚え方、注意点、例外など" />
        </label>

        <div className="row">
          <button className="primary" onClick={onSave}>
            登録する
          </button>
          <div className="status" role="status" aria-live="polite">
            {status}
          </div>
        </div>
      </div>
    </section>
  )
}

