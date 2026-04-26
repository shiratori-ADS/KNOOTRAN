import type { Dispatch, SetStateAction } from 'react'
import type { Entry } from '../../../db/types'

export type NounAutoForms = {
  n_nom_sg: string
  n_nom_pl: string
  n_acc_sg: string
  n_acc_pl: string
  n_gen_sg: string
  n_gen_pl: string
}

export function NounOverridesEditor({
  editOverrides,
  setEditOverrides,
  autoEditNoun,
}: {
  editOverrides: Entry['inflectionOverrides']
  setEditOverrides: Dispatch<SetStateAction<Entry['inflectionOverrides']>>
  autoEditNoun: NounAutoForms | null
}) {
  const valueOf = (k: keyof NounAutoForms) => (editOverrides as any)?.[k] ?? (autoEditNoun as any)?.[k] ?? ''
  const setValue = (k: keyof NounAutoForms, v: string) => setEditOverrides((p) => ({ ...(p ?? {}), [k]: v }))

  return (
    <div className="twoCol">
      <div>
        <div className="subtle" style={{ marginBottom: 6 }}>
          単数
        </div>
        <label className="field">
          <span className="label">～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('n_nom_sg')} placeholder="例：λόγος" onChange={(e) => setValue('n_nom_sg', e.target.value)} />
            <input className="mono greek" value={valueOf('n_gen_sg')} placeholder="例：λόγου" onChange={(e) => setValue('n_gen_sg', e.target.value)} />
            <input className="mono greek" value={valueOf('n_acc_sg')} placeholder="例：λόγο / λόγον" onChange={(e) => setValue('n_acc_sg', e.target.value)} />
          </div>
        </label>
      </div>

      <div>
        <div className="subtle" style={{ marginBottom: 6 }}>
          複数
        </div>
        <label className="field">
          <span className="label">～は / ～の / ～を</span>
          <div className="row wrap">
            <input className="mono greek" value={valueOf('n_nom_pl')} placeholder="例：λόγοι" onChange={(e) => setValue('n_nom_pl', e.target.value)} />
            <input className="mono greek" value={valueOf('n_gen_pl')} placeholder="例：λόγων" onChange={(e) => setValue('n_gen_pl', e.target.value)} />
            <input className="mono greek" value={valueOf('n_acc_pl')} placeholder="例：λόγους" onChange={(e) => setValue('n_acc_pl', e.target.value)} />
          </div>
        </label>
      </div>
    </div>
  )
}

