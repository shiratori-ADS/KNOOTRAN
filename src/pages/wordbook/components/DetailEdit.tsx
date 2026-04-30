import type { Dispatch, SetStateAction } from 'react'
import type { Entry, InflectionType, NounGender, PartOfSpeech } from '../../../db/types'

import { AdjectiveOverridesEditor, type AdjectiveAutoForms } from './AdjectiveOverridesEditor'
import { NounOverridesEditor, type NounAutoForms } from './NounOverridesEditor'
import { TagChips } from './TagChips'
import { VerbOverridesEditor, type VerbAorRow, type VerbRow } from './VerbOverridesEditor'
import { nounGenderOptions, verbInflectionOptions } from '../wordbookHelpers'

export function DetailEdit({
  editForeignLemma,
  setEditForeignLemma,
  editPos,
  setEditPos,
  editInflectionType,
  setEditInflectionType,
  editNounGender,
  setEditNounGender,
  editMeaningJaText,
  setEditMeaningJaText,
  editOverrides,
  setEditOverrides,
  autoEditVerb,
  autoEditAor,
  autoEditImp,
  autoEditNoun,
  autoEditAdj,
  editExamplesText,
  setEditExamplesText,
  editRelatedText,
  setEditRelatedText,
  tagOptions,
  editTags,
  toggleEditTag,
  editMemo,
  setEditMemo,
  status,
  onSave,
  onCancel,
  posOptions,
}: {
  editForeignLemma: string
  setEditForeignLemma: (v: string) => void
  editPos: PartOfSpeech
  setEditPos: (v: PartOfSpeech) => void
  editInflectionType: InflectionType
  setEditInflectionType: (v: InflectionType) => void
  editNounGender: NounGender
  setEditNounGender: (v: NounGender) => void
  editMeaningJaText: string
  setEditMeaningJaText: (v: string) => void
  editOverrides: Entry['inflectionOverrides']
  setEditOverrides: Dispatch<SetStateAction<Entry['inflectionOverrides']>>
  autoEditVerb: VerbRow[] | null
  autoEditAor: VerbAorRow[] | null
  autoEditImp: { pres2sg: string; pres2pl: string; aor2sg: string; aor2pl: string } | null
  autoEditNoun: NounAutoForms | null
  autoEditAdj: AdjectiveAutoForms | null
  editExamplesText: string
  setEditExamplesText: (v: string) => void
  editRelatedText: string
  setEditRelatedText: (v: string) => void
  tagOptions: string[]
  editTags: string[]
  toggleEditTag: (t: string) => void
  editMemo: string
  setEditMemo: (v: string) => void
  status: string
  onSave: () => void
  onCancel: () => void
  posOptions: Array<{ value: PartOfSpeech; label: string }>
}) {
  return (
    <>
      <label className="field">
        <span className="label">登録する単語</span>
        <input className="greek lemmaTitle" value={editForeignLemma} onChange={(e) => setEditForeignLemma(e.target.value)} />
      </label>

      <label className="field">
        <span className="label">品詞</span>
        <select
          value={editPos}
          onChange={(e) => {
            const next = e.target.value as PartOfSpeech
            setEditPos(next)
            if (next === 'verb') setEditInflectionType('verb_pres_act_-ω')
            else setEditInflectionType('none')
          }}
        >
          {posOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {editPos === 'verb' && (
        <label className="field">
          <span className="label">活用タイプ</span>
          <select value={editInflectionType} onChange={(e) => setEditInflectionType(e.target.value as InflectionType)}>
            {verbInflectionOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="help">文モードと活用マトリックス表示に使います。</span>
        </label>
      )}

      {editPos === 'noun' && (
        <label className="field">
          <span className="label">性（名詞）</span>
          <select value={editNounGender} onChange={(e) => setEditNounGender(e.target.value as NounGender)}>
            {nounGenderOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span className="label">意味（日本語）※必須（複数OK・改行区切り）</span>
        <textarea value={editMeaningJaText} onChange={(e) => setEditMeaningJaText(e.target.value)} rows={3} />
      </label>

      <div className="field">
        <span className="label">活用</span>
        <div className="help">
          {editPos === 'noun'
            ? !autoEditNoun
              ? 'この語形の活用タイプは未対応です。下の欄で活用形を手入力してください（入力した形は照合にも反映されます）。'
              : '名詞は見出し語の語尾と性から活用タイプを推定します。上書き/手入力した語形は単語モード/文モードの照合にも反映されます。'
            : editPos === 'verb'
              ? '動詞は活用タイプからマトリックスを表示します。上書き/手入力した語形は単語モード/文モードの照合にも反映されます。'
              : editPos === 'adjective'
                ? '形容詞は（いまは -ος のみ）見出し語から活用形を推定します。必要なら下の欄で上書きしてください（入力した形は照合にも反映されます）。'
                : '必要なら下の欄で語形（活用形）を手入力してください（入力した形は照合にも反映されます）。'}
        </div>

        {(editPos === 'noun' || editPos === 'verb') && (
          <div className="matrixEdit">
            {editPos === 'verb' ? (
              <VerbOverridesEditor
                editOverrides={editOverrides}
                setEditOverrides={setEditOverrides}
                autoEditVerb={autoEditVerb}
                autoEditAor={autoEditAor}
                autoEditImp={autoEditImp}
              />
            ) : (
              <NounOverridesEditor editOverrides={editOverrides} setEditOverrides={setEditOverrides} autoEditNoun={autoEditNoun} />
            )}
          </div>
        )}

        {editPos === 'adjective' && (
          <div className="matrixEdit">
            <AdjectiveOverridesEditor editOverrides={editOverrides} setEditOverrides={setEditOverrides} autoEditAdj={autoEditAdj} />
          </div>
        )}
      </div>

      <div className="twoCol">
        <label className="field">
          <span className="label">例文（任意・複数行）</span>
          <textarea
            value={editExamplesText}
            onChange={(e) => setEditExamplesText(e.target.value)}
            rows={4}
            placeholder={'例：\το κόκκινο μήλο\t赤いりんご\nΠονάει το κεφάλι μου.\t頭が痛い。'}
          />
          <span className="help">1行につき「原文[TAB]訳」。TABの代わりに「→」「=&gt;」「-&gt;」もOK。</span>
        </label>
        <label className="field">
          <span className="label">関連語（任意・複数行）</span>
          <textarea value={editRelatedText} onChange={(e) => setEditRelatedText(e.target.value)} rows={4} />
          {/* PCで例文欄と高さを揃えるためのスペーサー（例文側のhelpと同じ高さ） */}
          <span className="help" style={{ visibility: 'hidden' }} aria-hidden="true">
            1行につき「原文[TAB]訳」。TABの代わりに「→」「=&gt;」「-&gt;」もOK。
          </span>
        </label>
      </div>

      <label className="field">
        <span className="label">タグ（任意・複数OK）</span>
        <TagChips tagOptions={tagOptions} selectedTags={editTags} onToggle={toggleEditTag} />
      </label>

      <label className="field">
        <span className="label">メモ（任意）</span>
        <textarea value={editMemo} onChange={(e) => setEditMemo(e.target.value)} rows={3} />
      </label>

      <div className="row wrap">
        <button className="primary" onClick={onSave}>
          保存
        </button>
        <button className="danger" onClick={onCancel}>
          キャンセル
        </button>
        <div className="status" role="status" aria-live="polite">
          {status}
        </div>
      </div>
    </>
  )
}

