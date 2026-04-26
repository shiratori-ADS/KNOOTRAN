import type { Dispatch, SetStateAction } from 'react'
import type { Entry } from '../../../db/types'

type Key =
  | 'a_m_nom_sg'
  | 'a_m_gen_sg'
  | 'a_m_acc_sg'
  | 'a_f_nom_sg'
  | 'a_f_gen_sg'
  | 'a_f_acc_sg'
  | 'a_n_nom_sg'
  | 'a_n_gen_sg'
  | 'a_n_acc_sg'
  | 'a_m_nom_pl'
  | 'a_m_gen_pl'
  | 'a_m_acc_pl'
  | 'a_f_nom_pl'
  | 'a_f_gen_pl'
  | 'a_f_acc_pl'
  | 'a_n_nom_pl'
  | 'a_n_gen_pl'
  | 'a_n_acc_pl'

export type AdjectiveAutoForms = Record<Key, string>

export function AdjectiveOverridesEditor({
  editOverrides,
  setEditOverrides,
  autoEditAdj,
}: {
  editOverrides: Entry['inflectionOverrides']
  setEditOverrides: Dispatch<SetStateAction<Entry['inflectionOverrides']>>
  autoEditAdj: AdjectiveAutoForms | null
}) {
  const valueOf = (k: Key) => (editOverrides as any)?.[k] ?? (autoEditAdj as any)?.[k] ?? ''
  const setValue = (k: Key, v: string) => setEditOverrides((p) => ({ ...(p ?? {}), [k]: v }))

  return (
    <div className="twoCol">
      <div>
        <div className="subtle" style={{ marginBottom: 6 }}>
          単数
        </div>
        <label className="field">
          <span className="label">男性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('a_m_nom_sg')} onChange={(e) => setValue('a_m_nom_sg', e.target.value)} placeholder="例：μεγάλος" />
            <input className="mono greek" value={valueOf('a_m_gen_sg')} onChange={(e) => setValue('a_m_gen_sg', e.target.value)} placeholder="例：μεγάλου" />
            <input className="mono greek" value={valueOf('a_m_acc_sg')} onChange={(e) => setValue('a_m_acc_sg', e.target.value)} placeholder="例：μεγάλο" />
          </div>
        </label>
        <label className="field">
          <span className="label">女性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('a_f_nom_sg')} onChange={(e) => setValue('a_f_nom_sg', e.target.value)} placeholder="例：μεγάλη" />
            <input className="mono greek" value={valueOf('a_f_gen_sg')} onChange={(e) => setValue('a_f_gen_sg', e.target.value)} placeholder="例：μεγάλης" />
            <input className="mono greek" value={valueOf('a_f_acc_sg')} onChange={(e) => setValue('a_f_acc_sg', e.target.value)} placeholder="例：μεγάλη" />
          </div>
        </label>
        <label className="field">
          <span className="label">中性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('a_n_nom_sg')} onChange={(e) => setValue('a_n_nom_sg', e.target.value)} placeholder="例：μεγάλο" />
            <input className="mono greek" value={valueOf('a_n_gen_sg')} onChange={(e) => setValue('a_n_gen_sg', e.target.value)} placeholder="例：μεγάλου" />
            <input className="mono greek" value={valueOf('a_n_acc_sg')} onChange={(e) => setValue('a_n_acc_sg', e.target.value)} placeholder="例：μεγάλο" />
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
            <input className="mono greek" value={valueOf('a_m_nom_pl')} onChange={(e) => setValue('a_m_nom_pl', e.target.value)} placeholder="例：μεγάλοι" />
            <input className="mono greek" value={valueOf('a_m_gen_pl')} onChange={(e) => setValue('a_m_gen_pl', e.target.value)} placeholder="例：μεγάλων" />
            <input className="mono greek" value={valueOf('a_m_acc_pl')} onChange={(e) => setValue('a_m_acc_pl', e.target.value)} placeholder="例：μεγάλους" />
          </div>
        </label>
        <label className="field">
          <span className="label">女性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('a_f_nom_pl')} onChange={(e) => setValue('a_f_nom_pl', e.target.value)} placeholder="例：μεγάλες" />
            <input className="mono greek" value={valueOf('a_f_gen_pl')} onChange={(e) => setValue('a_f_gen_pl', e.target.value)} placeholder="例：μεγάλων" />
            <input className="mono greek" value={valueOf('a_f_acc_pl')} onChange={(e) => setValue('a_f_acc_pl', e.target.value)} placeholder="例：μεγάλες" />
          </div>
        </label>
        <label className="field">
          <span className="label">中性：～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('a_n_nom_pl')} onChange={(e) => setValue('a_n_nom_pl', e.target.value)} placeholder="例：μεγάλα" />
            <input className="mono greek" value={valueOf('a_n_gen_pl')} onChange={(e) => setValue('a_n_gen_pl', e.target.value)} placeholder="例：μεγάλων" />
            <input className="mono greek" value={valueOf('a_n_acc_pl')} onChange={(e) => setValue('a_n_acc_pl', e.target.value)} placeholder="例：μεγάλα" />
          </div>
        </label>
      </div>
    </div>
  )
}

