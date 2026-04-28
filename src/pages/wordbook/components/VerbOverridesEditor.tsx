import type { Dispatch, SetStateAction } from 'react'
import type { Entry } from '../../../db/types'
import type { VerbAorRow, VerbImperatives, VerbPerson, VerbRow } from '../../../grammar/verb'

export type VerbPersonKey = VerbPerson
export type VerbTense = 'pres' | 'past' | 'fut'

export type VerbOverrideKey =
  | `v_${VerbPersonKey}`
  | `v_past_${VerbPersonKey}`
  | `v_fut_${VerbPersonKey}`
  | `v_na_${VerbPersonKey}`
  | `v_aor_past_${VerbPersonKey}`
  | `v_aor_fut_${VerbPersonKey}`
  | `v_aor_na_${VerbPersonKey}`
  | 'v_imp_2sg'
  | 'v_imp_2pl'
  | 'v_aor_imp_2sg'
  | 'v_aor_imp_2pl'

export type { VerbRow, VerbAorRow }

export function VerbOverridesEditor({
  editOverrides,
  setEditOverrides,
  autoEditVerb,
  autoEditAor,
  autoEditImp,
}: {
  editOverrides: Entry['inflectionOverrides']
  setEditOverrides: Dispatch<SetStateAction<Entry['inflectionOverrides']>>
  autoEditVerb: VerbRow[] | null
  autoEditAor: VerbAorRow[] | null
  autoEditImp: VerbImperatives | null
}) {
  const valueOf = (k: VerbOverrideKey) => ((editOverrides as any)?.[k] as string | undefined) ?? ''
  const setValue = (k: VerbOverrideKey, v: string) => setEditOverrides((p) => ({ ...(p ?? {}), [k]: v }))

  const autoOf = (tense: VerbTense, person: VerbPersonKey) => {
    const r = autoEditVerb?.find((x) => x.person === person)
    if (!r) return ''
    if (tense === 'pres') return r.pres
    if (tense === 'past') return r.past
    return r.fut
  }

  const keyOf = (tense: VerbTense, person: VerbPersonKey): VerbOverrideKey => {
    if (tense === 'pres') return `v_${person}` as const
    if (tense === 'past') return `v_past_${person}` as const
    return `v_fut_${person}` as const
  }

  const aorKeyOf = (tense: 'pres' | 'aorPast' | 'aorFut', person: VerbPersonKey): VerbOverrideKey => {
    if (tense === 'pres') return `v_${person}` as const
    if (tense === 'aorPast') return `v_aor_past_${person}` as const
    return `v_aor_fut_${person}` as const
  }

  const aorNaKeyOf = (person: VerbPersonKey): VerbOverrideKey => `v_aor_na_${person}` as const
  const naKeyOf = (person: VerbPersonKey): VerbOverrideKey => `v_na_${person}` as const

  const autoNaFromFuture = (s: string) => (s ? s.replace(/^θα\s+/, 'να ') : '')

  const rows: Array<{ person: VerbPersonKey; label: string }> = [
    { person: '1sg', label: '一単' },
    { person: '2sg', label: '二単' },
    { person: '3sg', label: '三単' },
    { person: '1pl', label: '一複' },
    { person: '2pl', label: '二複' },
    { person: '3pl', label: '三複' },
  ]

  const autoAorOf = (tense: 'pres' | 'aorPast' | 'aorFut', person: VerbPersonKey) => {
    if (tense === 'pres') return autoOf('pres', person)
    const r = autoEditAor?.find((x) => x.person === person)
    if (!r) return ''
    if (tense === 'aorPast') return r.aorPast
    return r.aorFut
  }

  return (
    <>
      <div className="subtle" style={{ marginBottom: 6 }}>
        <span className="matrixSectionTitle">アオリスト</span>
      </div>
      <div className="matrixWrap">
        <table className="matrix">
          <thead>
            <tr>
              <th>区分</th>
              <th>現在</th>
              <th>過去</th>
              <th>未来</th>
              <th>να</th>
              <th>命令</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`aor-${r.person}`}>
                <td>{r.label}</td>
                {(['pres', 'aorPast', 'aorFut'] as const).map((tense) => {
                  const k = aorKeyOf(tense, r.person)
                  const auto = autoAorOf(tense, r.person)
                  const v = valueOf(k)
                  return (
                    <td key={`aor-${r.person}-${tense}`}>
                      <input
                        className="mono greek"
                        value={v || auto}
                        placeholder={auto || '（自動/任意）'}
                        onChange={(e) => setValue(k, e.target.value)}
                      />
                    </td>
                  )
                })}
                <td key={`aor-${r.person}-na`}>
                  <input
                    className="mono greek"
                    value={
                      valueOf(aorNaKeyOf(r.person)) ||
                      autoNaFromFuture(valueOf(aorKeyOf('aorFut', r.person)) || autoAorOf('aorFut', r.person))
                    }
                    placeholder="（自動/任意）"
                    onChange={(e) => setValue(aorNaKeyOf(r.person), e.target.value)}
                  />
                </td>
                <td key={`aor-${r.person}-imp`}>
                  {r.person === '2sg' || r.person === '2pl' ? (
                    <input
                      className="mono greek"
                      value={
                        r.person === '2sg'
                          ? valueOf('v_aor_imp_2sg') || (autoEditImp?.aor2sg ?? '')
                          : valueOf('v_aor_imp_2pl') || (autoEditImp?.aor2pl ?? '')
                      }
                      placeholder=""
                      onChange={(e) => setValue(r.person === '2sg' ? 'v_aor_imp_2sg' : 'v_aor_imp_2pl', e.target.value)}
                    />
                  ) : (
                    ''
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="subtle" style={{ marginTop: 12, marginBottom: 6 }}>
        <span className="matrixSectionTitle">継続・繰返し</span>
      </div>
      <div className="matrixWrap">
        <table className="matrix">
          <thead>
            <tr>
              <th>区分</th>
              <th>現在</th>
              <th>過去</th>
              <th>未来</th>
              <th>να</th>
              <th>命令</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.person}>
                <td>{r.label}</td>
                {(['pres', 'past', 'fut'] as const).map((tense) => {
                  const k = keyOf(tense, r.person)
                  const auto = autoOf(tense, r.person)
                  const v = valueOf(k)
                  return (
                    <td key={`${r.person}-${tense}`}>
                      <input
                        className="mono greek"
                        value={v || auto}
                        placeholder={auto || '（任意）'}
                        onChange={(e) => setValue(k, e.target.value)}
                      />
                    </td>
                  )
                })}
                <td key={`${r.person}-na`}>
                  <input
                    className="mono greek"
                    value={valueOf(naKeyOf(r.person)) || autoNaFromFuture(valueOf(keyOf('fut', r.person)) || autoOf('fut', r.person))}
                    placeholder="（自動/任意）"
                    onChange={(e) => setValue(naKeyOf(r.person), e.target.value)}
                  />
                </td>
                <td key={`${r.person}-imp`}>
                  {r.person === '2sg' || r.person === '2pl' ? (
                    <input
                      className="mono greek"
                      value={
                        r.person === '2sg'
                          ? valueOf('v_imp_2sg') || (autoEditImp?.pres2sg ?? '')
                          : valueOf('v_imp_2pl') || (autoEditImp?.pres2pl ?? '')
                      }
                      placeholder=""
                      onChange={(e) => setValue(r.person === '2sg' ? 'v_imp_2sg' : 'v_imp_2pl', e.target.value)}
                    />
                  ) : (
                    ''
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

