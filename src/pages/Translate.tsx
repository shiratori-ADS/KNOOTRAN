import { useMemo, useState } from 'react'
import { translateKnownOnly, type TranslateDirection } from '../lib/translate'
import { translateSentenceForeignToJa } from '../grammar/engine'

function renderOutput(pieces: Awaited<ReturnType<typeof translateKnownOnly>>['pieces']) {
  return pieces.map((p, idx) => {
    if (p.kind === 'sep') return <span key={idx}>{p.raw}</span>
    if (p.kind === 'known')
      return (
        <span key={idx} className="known" title={`既知（entryId=${p.entryId}）`}>
          {p.out}
        </span>
      )
    return (
      <span key={idx} className="unknown" title="未登録">
        {p.raw}
      </span>
    )
  })
}

export function Translate() {
  const [direction, setDirection] = useState<TranslateDirection>('foreign_to_ja')
  const [mode, setMode] = useState<'word' | 'sentence'>('word')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof translateKnownOnly>> | null>(null)
  const [sentenceJa, setSentenceJa] = useState<string>('')
  const [sentenceUnknowns, setSentenceUnknowns] = useState<string[]>([])

  // 翻訳対象は当面ギリシャ語固定（設定には依存しない）
  const directionLabel = useMemo(() => {
    return direction === 'foreign_to_ja' ? `ギリシャ語 → 日本語` : `日本語 → ギリシャ語`
  }, [direction])

  async function onTranslate() {
    setBusy(true)
    try {
      setSentenceJa('')
      setSentenceUnknowns([])
      if (mode === 'sentence' && direction === 'foreign_to_ja') {
        const r = await translateKnownOnly(input, direction)
        setResult(r)
        const s = await translateSentenceForeignToJa(input)
        setSentenceJa(s.ja)
        setSentenceUnknowns(s.unknownTokens)
      } else {
        const r = await translateKnownOnly(input, direction)
        setResult(r)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page">
      <h2>翻訳</h2>
      <div className="card">
        <div className="row wrap">
          <label className="field inline">
            <span className="label">方向</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value as TranslateDirection)}>
              <option value="foreign_to_ja">ギリシャ語 → 日本語</option>
              <option value="ja_to_foreign">日本語 → ギリシャ語</option>
            </select>
          </label>
          <label className="field inline">
            <span className="label">モード</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'word' | 'sentence')}
              disabled={direction !== 'foreign_to_ja'}
              title={direction !== 'foreign_to_ja' ? '文モードは「外国語→日本語」のみ対応です' : undefined}
            >
              <option value="word">単語</option>
              <option value="sentence">文（試作）</option>
            </select>
          </label>
          <button className="primary" onClick={onTranslate} disabled={busy}>
            {busy ? '変換中…' : '変換する'}
          </button>
        </div>

        <label className="field">
          <span className="label">入力</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            placeholder={
              direction === 'foreign_to_ja'
                ? mode === 'sentence'
                  ? '例：Αγοράζω μήλο.'
                  : '例：λύω λύεις λύει'
                : '※プロトタイプは「スペース区切り」の単語入力を推奨\n例：見る 愛 美しい'
            }
          />
          <span className="help">
            未登録の箇所は赤で表示します（＝あなたの「知っている範囲外」）。文モードは単語帳＋最小ルールで日本語文を生成します。
          </span>
        </label>
      </div>

      {mode === 'sentence' && direction === 'foreign_to_ja' && (
        <div className="card">
          <h3>文の生成結果（試作）</h3>
          <div className="output">
            {sentenceJa ? <span className="known">{sentenceJa}</span> : <span className="subtle">まだ変換していません。</span>}
          </div>
          {sentenceUnknowns.length > 0 && (
            <div className="subtle" style={{ marginTop: 10 }}>
              文モードで未解析の単語: <span className="mono">{sentenceUnknowns.join(' ')}</span>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>結果（{directionLabel}）</h3>
        <div className="output">{result ? renderOutput(result.pieces) : <span className="subtle">まだ変換していません。</span>}</div>
      </div>

      {result && result.unknowns.length > 0 && (
        <div className="card">
          <h3>翻訳できない箇所</h3>
          <ul className="unknownList">
            {result.unknowns.map((u, i) => (
              <li key={`${u.token}-${i}`}>
                <div className="unknownToken">
                  <span className="badge">未登録</span>
                  <span className="mono">{u.token}</span>
                </div>
                {u.suggestions.length > 0 ? (
                  <div className="suggestions">
                    <div className="subtle">候補（綴り近似）</div>
                    <ul>
                      {u.suggestions.map((s) => (
                        <li key={`${s.entryId}-${s.score}`}>
                          <span className="mono">{s.label}</span> <span className="subtle">(score={s.score})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="subtle">（この方向では候補表示は未実装です）</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

