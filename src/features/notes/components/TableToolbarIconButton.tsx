import type { ReactNode } from 'react'

type Props = {
  label: string
  active?: boolean
  variant?: 'secondary' | 'danger'
  onClick: () => void
  children: ReactNode
}

export function TableToolbarIconButton({ label, active = false, variant = 'secondary', onClick, children }: Props) {
  const className = active
    ? 'noteToolbarBtn noteToolbarBtnIcon active'
    : `noteToolbarBtn noteToolbarBtnIcon ${variant}`

  return (
    <button type="button" className={className} onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  )
}
