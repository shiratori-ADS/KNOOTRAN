import type { Dispatch, SetStateAction } from 'react'
import type { Entry, PersonalPronounCol, PersonalPronounInflectionKey, PersonalPronounRow } from '../../../db/types'
import { PP_COL_LABELS, PP_COLS, PP_ROW_LABELS, PP_ROWS, ppKey } from '../wordbookHelpers'

export type PersonalPronounAutoForms = Record<PersonalPronounInflectionKey, string>

export function PersonalPronounOverridesEditor({
  editOverrides,
  setEditOverrides,
  autoEditPp,
}: {
  editOverrides: Entry['inflectionOverrides']
  setEditOverrides: Dispatch<SetStateAction<Entry['inflectionOverrides']>>
  autoEditPp: PersonalPronounAutoForms | null
}) {
  const valueOf = (k: PersonalPronounInflectionKey) =>
    (editOverrides as Record<string, string> | undefined)?.[k] ?? (autoEditPp?.[k] ?? '')
  const setValue = (k: PersonalPronounInflectionKey, v: string) =>
    setEditOverrides((p) => ({ ...(p ?? {}), [k]: v }))

  return (
    <div className="matrixEdit">
      <div className="matrixWrap ppMatrixEdit">
      <table className="matrix">
        <thead>
          <tr>
            <th></th>
            {PP_COLS.map((col: PersonalPronounCol) => (
              <th key={col}>{PP_COL_LABELS[col]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PP_ROWS.map((row: PersonalPronounRow) => (
            <tr key={row}>
              <td>{PP_ROW_LABELS[row]}</td>
              {PP_COLS.map((col: PersonalPronounCol) => {
                const k = ppKey(row, col)
                return (
                  <td key={`${row}-${col}`}>
                    <input className="mono greek" value={valueOf(k)} onChange={(e) => setValue(k, e.target.value)} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
