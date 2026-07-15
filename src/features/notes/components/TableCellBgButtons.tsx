import { NOTE_CELL_BG_COLORS } from '../noteHelpers'
import { NoteColorTileSelect } from './NoteColorTileSelect'

type Props = {
  currentBg: string
  onChange: (color: string) => void
}

export function TableCellBgButtons({ currentBg, onChange }: Props) {
  return (
    <NoteColorTileSelect
      label="セル色"
      options={NOTE_CELL_BG_COLORS}
      value={currentBg}
      onChange={onChange}
      ariaLabel="セルの背景色"
      title="セルの背景色"
      labelClassName="noteTableToolbarSubLabel"
      groupClassName="noteTableToolbarGroup"
    />
  )
}
