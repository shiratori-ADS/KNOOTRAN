import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  TABLE_BORDER_SIDES,
  TABLE_BORDER_STYLES,
  type TableBorderSide,
  type TableBorderStyle,
} from '../tableHelpers'

type Props = {
  onApply: (style: TableBorderStyle, side: TableBorderSide) => void
}

type MenuPos = { top: number; left: number }

type IconProps = { className?: string }

function BorderBoxIcon({
  className,
  top = false,
  right = false,
  bottom = false,
  left = false,
}: IconProps & { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean }) {
  const dim = 'color-mix(in oklab, currentColor 22%, transparent)'
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" fill="none" stroke={dim} strokeWidth="1.5" />
      {top ? <line x1="5" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" /> : null}
      {bottom ? <line x1="5" y1="19" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" /> : null}
      {left ? <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" /> : null}
      {right ? <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" /> : null}
    </svg>
  )
}

function SideIcon({ side, className }: { side: TableBorderSide; className?: string }) {
  switch (side) {
    case 'all':
      return <BorderBoxIcon className={className} top right bottom left />
    case 'top':
      return <BorderBoxIcon className={className} top />
    case 'bottom':
      return <BorderBoxIcon className={className} bottom />
    case 'left':
      return <BorderBoxIcon className={className} left />
    case 'right':
      return <BorderBoxIcon className={className} right />
    case 'horizontal':
      return <BorderBoxIcon className={className} top bottom />
    case 'vertical':
      return <BorderBoxIcon className={className} left right />
  }
}

function StyleNoneIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.45" />
      <line x1="7" y1="17" x2="17" y2="7" stroke="#c44" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function StyleSolidIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function StyleDottedIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1.5 3.5" />
    </svg>
  )
}

function StyleDashedIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />
    </svg>
  )
}

function StyleDoubleIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="9.5" x2="20" y2="9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="14.5" x2="20" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function StyleIcon({ style, className }: { style: TableBorderStyle; className?: string }) {
  switch (style) {
    case 'none':
      return <StyleNoneIcon className={className} />
    case 'solid':
      return <StyleSolidIcon className={className} />
    case 'dotted':
      return <StyleDottedIcon className={className} />
    case 'dashed':
      return <StyleDashedIcon className={className} />
    case 'double':
      return <StyleDoubleIcon className={className} />
  }
}

function IconMenu({
  open,
  setOpen,
  triggerRef,
  menuRef,
  listId,
  ariaLabel,
  title,
  menuWidth,
  triggerIcon,
  children,
}: {
  open: boolean
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  triggerRef: RefObject<HTMLButtonElement | null>
  menuRef: RefObject<HTMLDivElement | null>
  listId: string
  ariaLabel: string
  title: string
  menuWidth: number
  triggerIcon: ReactNode
  children: ReactNode
}) {
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, left: 0 })

  function updateMenuPos() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8)
    setMenuPos({ top: rect.bottom + 4, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPos()
  }, [open, menuWidth])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      updateMenuPos()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, menuWidth, menuRef, setOpen, triggerRef])

  return (
    <span className="noteBorderPicker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="noteBorderTrigger noteBorderTriggerIconOnly"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title={title}
        onClick={() => setOpen((v) => !v)}
      >
        {triggerIcon}
        <span className="noteColorChevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="noteBorderMenu noteBorderMenuIcons"
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              style={{ top: menuPos.top, left: menuPos.left, width: menuWidth }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}

export function TableBorderStyleSelect({ onApply }: Props) {
  const [style, setStyle] = useState<TableBorderStyle>('solid')
  const [side, setSide] = useState<TableBorderSide>('all')
  const [sideOpen, setSideOpen] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const sideTriggerRef = useRef<HTMLButtonElement | null>(null)
  const styleTriggerRef = useRef<HTMLButtonElement | null>(null)
  const sideMenuRef = useRef<HTMLDivElement | null>(null)
  const styleMenuRef = useRef<HTMLDivElement | null>(null)
  const sideListId = useId()
  const styleListId = useId()

  return (
    <span className="noteTableToolbarGroup">
      <span className="noteTableToolbarSubLabel">線</span>
      <IconMenu
        open={sideOpen}
        setOpen={(v) => {
          setSideOpen(v)
          if (v) setStyleOpen(false)
        }}
        triggerRef={sideTriggerRef}
        menuRef={sideMenuRef}
        listId={sideListId}
        ariaLabel="線の向き"
        title="線の向き（選択中のセル）"
        menuWidth={148}
        triggerIcon={<SideIcon side={side} className="noteToolbarBtnSvg" />}
      >
        {TABLE_BORDER_SIDES.map((s) => {
          const active = s.value === side
          return (
            <button
              key={s.value}
              type="button"
              role="option"
              aria-selected={active}
              aria-label={s.label}
              title={s.label}
              className={active ? 'noteBorderOption noteBorderOptionIcon active' : 'noteBorderOption noteBorderOptionIcon'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSide(s.value)
                onApply(style, s.value)
                setSideOpen(false)
              }}
            >
              <SideIcon side={s.value} className="noteToolbarBtnSvg" />
            </button>
          )
        })}
      </IconMenu>

      <IconMenu
        open={styleOpen}
        setOpen={(v) => {
          setStyleOpen(v)
          if (v) setSideOpen(false)
        }}
        triggerRef={styleTriggerRef}
        menuRef={styleMenuRef}
        listId={styleListId}
        ariaLabel="線種"
        title="線種（なし / 実線 / 点線 / 破線 / 二重線）"
        menuWidth={148}
        triggerIcon={<StyleIcon style={style} className="noteToolbarBtnSvg" />}
      >
        {TABLE_BORDER_STYLES.map((s) => {
          const active = s.value === style
          return (
            <button
              key={s.value}
              type="button"
              role="option"
              aria-selected={active}
              aria-label={s.label}
              title={s.label}
              className={active ? 'noteBorderOption noteBorderOptionIcon active' : 'noteBorderOption noteBorderOptionIcon'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setStyle(s.value)
                onApply(s.value, side)
                setStyleOpen(false)
              }}
            >
              <StyleIcon style={s.value} className="noteToolbarBtnSvg" />
            </button>
          )
        })}
      </IconMenu>
    </span>
  )
}
