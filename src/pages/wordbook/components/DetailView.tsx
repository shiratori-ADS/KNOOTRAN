import type { Entry } from '../../../db/types'
import { InflectionSection } from './InflectionSection'
import { displayForm, genderLabel, inflectionLabel, posLabel, verbInflectionShortLabel } from '../wordbookHelpers'

export function DetailView({
  selected,
  isMobile,
  status,
  lookupStatus,
  onBackToList,
  onEdit,
  onDelete,
  onLookupRelated,
}: {
  selected: Entry
  isMobile: boolean
  status: string
  lookupStatus: string
  onBackToList: () => void
  onEdit: () => void
  onDelete: () => void
  onLookupRelated: (term: string) => void
}) {
  return (
    <>
      <div className="kv">
        <div className="k">意味</div>
        <div className="v">{selected.meaningJaVariants?.join(' / ') ?? selected.meaningJaPrimary}</div>
      </div>
      {selected.pos === 'verb' && (
        <div className="kv">
          <div className="k">活用タイプ</div>
          <div className="v">{inflectionLabel(selected.inflectionType)}</div>
        </div>
      )}

      <div className="kv">
        <div className="k">活用</div>
        <div className="v">
          <InflectionSection selected={selected} />
        </div>
      </div>

      <div className="kv">
        <div className="k">例文</div>
        <div className="v">
          {selected.examples?.length ? (
            <ul>
              {selected.examples.map((x, i) => (
                <li key={`${x}-${i}`}>{x}</li>
              ))}
            </ul>
          ) : (
            <span className="subtle">（なし）</span>
          )}
        </div>
      </div>
      <div className="kv">
        <div className="k">関連語</div>
        <div className="v">
          {selected.related?.length ? (
            <>
              <div className="chips">
                {selected.related.map((x, i) => (
                  <button key={`${x}-${i}`} className="chipButton mono" onClick={() => onLookupRelated(x)}>
                    {x}
                  </button>
                ))}
              </div>
              {lookupStatus && <div className="subtle">{lookupStatus}</div>}
            </>
          ) : (
            <span className="subtle">（なし）</span>
          )}
        </div>
      </div>
      <div className="kv">
        <div className="k">メモ</div>
        <div className="v">
          {selected.memo?.trim() ? <span style={{ whiteSpace: 'pre-wrap' }}>{selected.memo}</span> : <span className="subtle">（なし）</span>}
        </div>
      </div>

      <div className="row wrap">
        {isMobile && (
          <button className="secondary" onClick={onBackToList}>
            一覧に戻る
          </button>
        )}
        <button className="primary" onClick={onEdit}>
          編集
        </button>
        <button className="danger" onClick={onDelete}>
          削除
        </button>
        <div className="status" role="status" aria-live="polite">
          {status}
        </div>
      </div>
    </>
  )
}

export function DetailHeader({ selected }: { selected: Entry }) {
  return (
    <div className="row wrap">
      <span className="greek big v lemmaTitle">{displayForm(selected.foreignLemma ?? selected.foreignForms[0] ?? '(no form)')}</span>
      {selected.pos === 'noun' ? (
        <span className="badge badgePos badgePos-noun">{`${posLabel(selected.pos)}:${genderLabel(selected.nounGender)}`}</span>
      ) : selected.pos === 'verb' && verbInflectionShortLabel(selected.inflectionType) ? (
        <span className={`badge badgePos badgePos-${selected.pos}`}>{`${posLabel(selected.pos)} : ${verbInflectionShortLabel(selected.inflectionType)}`}</span>
      ) : (
        <span className={`badge badgePos badgePos-${selected.pos}`}>{posLabel(selected.pos)}</span>
      )}
      {selected.tags?.length ? (
        <div className="chips">
          {selected.tags.map((t) => (
            <span key={t} className="chip mono">
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

