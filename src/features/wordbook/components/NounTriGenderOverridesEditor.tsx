import type { Dispatch, SetStateAction } from 'react'
import type { Entry } from '../../../db/types'
import type { NounTriGenderKey } from '../../../grammar/nounTriGender'

export function NounTriGenderOverridesEditor({
  editOverrides,
  setEditOverrides,
}: {
  editOverrides: Entry['inflectionOverrides']
  setEditOverrides: Dispatch<SetStateAction<Entry['inflectionOverrides']>>
}) {
  const valueOf = (k: NounTriGenderKey) => (editOverrides as Record<string, string> | undefined)?.[k] ?? ''
  const setValue = (k: NounTriGenderKey, v: string) => setEditOverrides((p) => ({ ...(p ?? {}), [k]: v }))

  return (
    <div className="twoCol">
      <div>
        <div className="subtle" style={{ marginBottom: 6 }}>
          単数
        </div>
        <label className="field">
          <span className="label">男性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('n_m_nom_sg')} onChange={(e) => setValue('n_m_nom_sg', e.target.value)} placeholder="例：ένας" />
            <input className="mono greek" value={valueOf('n_m_gen_sg')} onChange={(e) => setValue('n_m_gen_sg', e.target.value)} placeholder="例：ενός" />
            <input className="mono greek" value={valueOf('n_m_acc_sg')} onChange={(e) => setValue('n_m_acc_sg', e.target.value)} placeholder="例：έναν" />
          </div>
        </label>
        <label className="field">
          <span className="label">女性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('n_f_nom_sg')} onChange={(e) => setValue('n_f_nom_sg', e.target.value)} placeholder="例：μία" />
            <input className="mono greek" value={valueOf('n_f_gen_sg')} onChange={(e) => setValue('n_f_gen_sg', e.target.value)} placeholder="例：μίας" />
            <input className="mono greek" value={valueOf('n_f_acc_sg')} onChange={(e) => setValue('n_f_acc_sg', e.target.value)} placeholder="例：μία" />
          </div>
        </label>
        <label className="field">
          <span className="label">中性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('n_n_nom_sg')} onChange={(e) => setValue('n_n_nom_sg', e.target.value)} placeholder="例：ένα" />
            <input className="mono greek" value={valueOf('n_n_gen_sg')} onChange={(e) => setValue('n_n_gen_sg', e.target.value)} placeholder="例：ενός" />
            <input className="mono greek" value={valueOf('n_n_acc_sg')} onChange={(e) => setValue('n_n_acc_sg', e.target.value)} placeholder="例：ένα" />
          </div>
        </label>
      </div>

      <div>
        <div className="subtle" style={{ marginBottom: 6 }}>
          複数
        </div>
        <label className="field">
          <span className="label">男性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('n_m_nom_pl')} onChange={(e) => setValue('n_m_nom_pl', e.target.value)} />
            <input className="mono greek" value={valueOf('n_m_gen_pl')} onChange={(e) => setValue('n_m_gen_pl', e.target.value)} />
            <input className="mono greek" value={valueOf('n_m_acc_pl')} onChange={(e) => setValue('n_m_acc_pl', e.target.value)} />
          </div>
        </label>
        <label className="field">
          <span className="label">女性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('n_f_nom_pl')} onChange={(e) => setValue('n_f_nom_pl', e.target.value)} />
            <input className="mono greek" value={valueOf('n_f_gen_pl')} onChange={(e) => setValue('n_f_gen_pl', e.target.value)} />
            <input className="mono greek" value={valueOf('n_f_acc_pl')} onChange={(e) => setValue('n_f_acc_pl', e.target.value)} />
          </div>
        </label>
        <label className="field">
          <span className="label">中性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('n_n_nom_pl')} onChange={(e) => setValue('n_n_nom_pl', e.target.value)} />
            <input className="mono greek" value={valueOf('n_n_gen_pl')} onChange={(e) => setValue('n_n_gen_pl', e.target.value)} />
            <input className="mono greek" value={valueOf('n_n_acc_pl')} onChange={(e) => setValue('n_n_acc_pl', e.target.value)} />
          </div>
        </label>
      </div>
    </div>
  )
}
