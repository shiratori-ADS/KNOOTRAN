import { TableToolbarIconButton } from './TableToolbarIconButton'

type IconProps = {
  className?: string
}

function DeleteRowIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <line x1="9" y1="10" x2="15" y2="14" />
      <line x1="15" y1="10" x2="9" y2="14" />
    </svg>
  )
}

function DeleteColIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="4" x2="8" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
      <line x1="10" y1="9" x2="14" y2="15" />
      <line x1="14" y1="9" x2="10" y2="15" />
    </svg>
  )
}

function DeleteTableIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="14" x2="21" y2="14" />
      <line x1="9" y1="5" x2="9" y2="19" />
      <line x1="15" y1="5" x2="15" y2="19" />
      <line x1="7" y1="7" x2="17" y2="17" />
      <line x1="17" y1="7" x2="7" y2="17" />
    </svg>
  )
}

type Props = {
  onDeleteRow: () => void
  onDeleteCol: () => void
  onDeleteTable: () => void
}

export function TableDeleteButtons({ onDeleteRow, onDeleteCol, onDeleteTable }: Props) {
  return (
    <span className="noteTableToolbarGroup">
      <span className="noteTableToolbarSubLabel">削除</span>
      <TableToolbarIconButton label="行を削除" onClick={onDeleteRow}>
        <DeleteRowIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
      <TableToolbarIconButton label="列を削除" onClick={onDeleteCol}>
        <DeleteColIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
      <TableToolbarIconButton label="表全体を削除" variant="danger" onClick={onDeleteTable}>
        <DeleteTableIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
    </span>
  )
}
