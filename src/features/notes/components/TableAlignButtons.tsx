import { TableToolbarIconButton } from './TableToolbarIconButton'

type IconProps = {
  className?: string
}

function AlignLeftIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="17" y2="18" />
    </svg>
  )
}

function AlignCenterIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="5" y1="18" x2="19" y2="18" />
    </svg>
  )
}

function AlignRightIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="7" y1="18" x2="20" y2="18" />
    </svg>
  )
}

type Props = {
  currentAlign: 'left' | 'center' | 'right'
  onAlignLeft: () => void
  onAlignCenter: () => void
  onAlignRight: () => void
}

export function TableAlignButtons({ currentAlign, onAlignLeft, onAlignCenter, onAlignRight }: Props) {
  return (
    <span className="noteTableToolbarGroup">
      <span className="noteTableToolbarSubLabel">位置</span>
      <TableToolbarIconButton active={currentAlign === 'left'} label="左揃え" onClick={onAlignLeft}>
        <AlignLeftIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
      <TableToolbarIconButton active={currentAlign === 'center'} label="中央揃え" onClick={onAlignCenter}>
        <AlignCenterIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
      <TableToolbarIconButton active={currentAlign === 'right'} label="右揃え" onClick={onAlignRight}>
        <AlignRightIcon className="noteToolbarBtnSvg" />
      </TableToolbarIconButton>
    </span>
  )
}
