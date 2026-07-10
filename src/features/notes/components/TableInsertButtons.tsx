import { TableToolbarIconButton } from './TableToolbarIconButton'

type IconProps = {
  className?: string
}

function InsertRowAboveIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="17" x2="20" y2="17" />
      <line x1="4" y1="21" x2="20" y2="21" />
      <polyline points="12,14 12,5" />
      <polyline points="8,9 12,5 16,9" />
    </svg>
  )
}

function InsertRowBelowIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="11" x2="20" y2="11" />
      <polyline points="12,14 12,19" />
      <polyline points="8,15 12,19 16,15" />
    </svg>
  )
}

function InsertColLeftIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="13" y1="4" x2="13" y2="20" />
      <line x1="17" y1="4" x2="17" y2="20" />
      <polyline points="10,12 5,12" />
      <polyline points="9,8 5,12 9,16" />
    </svg>
  )
}

function InsertColRightIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="7" y1="4" x2="7" y2="20" />
      <line x1="11" y1="4" x2="11" y2="20" />
      <polyline points="14,12 19,12" />
      <polyline points="15,8 19,12 15,16" />
    </svg>
  )
}

type Props = {
  onInsertRowAbove: () => void
  onInsertRowBelow: () => void
  onInsertColLeft: () => void
  onInsertColRight: () => void
}

export function TableInsertButtons({
  onInsertRowAbove,
  onInsertRowBelow,
  onInsertColLeft,
  onInsertColRight,
}: Props) {
  return (
    <span className="noteTableToolbarGroup">
      <span className="noteTableToolbarSubLabel">追加</span>
      <TableToolbarIconButton label="上に行を追加" onClick={onInsertRowAbove}>
        <InsertRowAboveIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
      <TableToolbarIconButton label="下に行を追加" onClick={onInsertRowBelow}>
        <InsertRowBelowIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
      <TableToolbarIconButton label="左に列を追加" onClick={onInsertColLeft}>
        <InsertColLeftIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
      <TableToolbarIconButton label="右に列を追加" onClick={onInsertColRight}>
        <InsertColRightIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
    </span>
  )
}
